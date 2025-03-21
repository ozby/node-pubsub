import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import config from '../config';
import Notification, { INotification } from '../models/Notification';
import logger from '../utils/logger';

// Define the collections to watch
const WATCHED_COLLECTIONS = ['messages', 'queues'];

// Define event types for different operations
const EVENT_TYPES = {
  MESSAGE_CREATED: 'message.created',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',
  QUEUE_CREATED: 'queue.created',
  QUEUE_UPDATED: 'queue.updated',
};

// Define interfaces for change stream document types
interface ResumeToken {
  _data: string;
}

interface UpdateDescription {
  updatedFields?: Record<string, unknown>;
  removedFields?: string[];
}

interface MongoChangeStreamDocument {
  _id: ResumeToken;
  operationType: string;
  documentKey: { _id: ObjectId };
  fullDocument?: Record<string, unknown>;
  updateDescription?: UpdateDescription;
}

// Interface for a generic change stream with the necessary methods
interface ChangeStreamType {
  on(event: 'change', listener: (change: MongoChangeStreamDocument) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: string, listener: (arg: unknown) => void): void;
  close(): Promise<void>;
}

class ChangeStreamService {
  private changeStreams: Map<string, ChangeStreamType> = new Map();
  private resumeTokens: Map<string, unknown> = new Map();
  private db: mongoose.Connection;
  private isInitialized = false;

  constructor() {
    // Initialize db connection to null, it will be set when initialize() is called
    this.db = mongoose.connection;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Watch collections
    await this.watchCollections();
    
    this.isInitialized = true;
    logger.info('ChangeStreamService initialized');
  }

  private async watchCollections(): Promise<void> {
    for (const collectionName of WATCHED_COLLECTIONS) {
      await this.watchCollection(collectionName);
    }
  }

  private async watchCollection(collectionName: string): Promise<void> {
    try {
      const collection = this.db.collection(collectionName);
      
      // Get the last stored resume token for this collection
      const lastNotification = await Notification.findOne(
        { collection: collectionName },
        {},
        { sort: { createdAt: -1 } }
      );
      
      let resumeToken = this.resumeTokens.get(collectionName);
      if (lastNotification && !resumeToken) {
        resumeToken = { _data: lastNotification.get('resumeToken') };
      }

      const options = {
        ...config.changeStream,
        ...(resumeToken ? { resumeAfter: resumeToken } : {}),
      };

      const changeStream = collection.watch([], options);
      
      changeStream.on('change', (change) => this.handleChange(collectionName, change as MongoChangeStreamDocument));
      
      changeStream.on('error', (error) => {
        logger.error(`Error in change stream for ${collectionName}:`, error);
        this.restartStream(collectionName);
      });

      this.changeStreams.set(collectionName, changeStream);
      logger.info(`Change stream started for collection: ${collectionName}`);
    } catch (error) {
      logger.error(`Failed to start change stream for ${collectionName}:`, error);
      // Attempt to restart after a delay
      setTimeout(() => this.watchCollection(collectionName), 5000);
    }
  }

  private async handleChange(collectionName: string, change: MongoChangeStreamDocument): Promise<void> {
    try {
      // Store the resume token for recovery
      if (change._id) {
        this.resumeTokens.set(collectionName, change._id);
      }

      const { operationType, documentKey, fullDocument, updateDescription } = change;
      const documentId = documentKey._id.toString();

      // Determine the event type
      const event = this.determineEventType(collectionName, operationType);
      
      // Create a notification record to track this event
      const notification = await Notification.create({
        event,
        documentId,
        collection: collectionName,
        operationType,
        payload: {
          fullDocument,
          updateDescription,
          resumeToken: change._id._data,
        },
        status: 'completed',
        processedAt: new Date(),
      });

      logger.info(`New change processed in ${collectionName}, type: ${operationType}, id: ${documentId}`);
      
      // Process the notification
      await this.processNotification(notification);
    } catch (error) {
      logger.error('Error handling change stream event:', error);
    }
  }

  private async processNotification(notification: INotification): Promise<void> {
    try {
      const { event, documentId } = notification;

      // Process different types of events
      if (event.startsWith('message.')) {
        if (event === EVENT_TYPES.MESSAGE_CREATED) {
          // Handle new message creation
          logger.info(`Processing new message event: ${documentId}`);
          // TODO: Implement processing logic
        } else if (event === EVENT_TYPES.MESSAGE_UPDATED) {
          // Handle message updates
          logger.info(`Processing message update event: ${documentId}`);
          // TODO: Implement update logic
        }
      } else if (event.startsWith('queue.')) {
        // Handle queue events
        logger.info(`Processing queue event: ${event}, doc: ${documentId}`);
        // TODO: Implement queue event handling
      }
    } catch (error) {
      logger.error(`Error processing notification ${notification.id}:`, error);
      await Notification.findByIdAndUpdate(notification.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private determineEventType(collectionName: string, operationType: string): string {
    if (collectionName === 'messages') {
      if (operationType === 'insert') return EVENT_TYPES.MESSAGE_CREATED;
      if (operationType === 'update') return EVENT_TYPES.MESSAGE_UPDATED;
      if (operationType === 'delete') return EVENT_TYPES.MESSAGE_DELETED;
    } else if (collectionName === 'queues') {
      if (operationType === 'insert') return EVENT_TYPES.QUEUE_CREATED;
      if (operationType === 'update') return EVENT_TYPES.QUEUE_UPDATED;
    }
    
    return `${collectionName}.${operationType}`;
  }

  private async restartStream(collectionName: string): Promise<void> {
    const existingStream = this.changeStreams.get(collectionName);
    if (existingStream) {
      try {
        await existingStream.close();
      } catch (e) {
        logger.error(`Error closing change stream for ${collectionName}:`, e);
      }
    }
    
    logger.info(`Restarting change stream for ${collectionName}`);
    setTimeout(() => this.watchCollection(collectionName), 1000);
  }

  async close(): Promise<void> {
    logger.info('Closing all change streams...');
    
    const closePromises = Array.from(this.changeStreams.entries()).map(async ([name, stream]) => {
      try {
        await stream.close();
        logger.info(`Change stream for ${name} closed`);
      } catch (error) {
        logger.error(`Error closing change stream for ${name}:`, error);
      }
    });
    
    await Promise.all(closePromises);
    this.changeStreams.clear();
    
    this.isInitialized = false;
    logger.info('All change streams closed');
  }
}

export default new ChangeStreamService(); 