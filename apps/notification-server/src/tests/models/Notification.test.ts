import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification from '../../models/Notification';

describe('Notification Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Notification.deleteMany({});
  });

  it('should create a new notification successfully', async () => {
    const notificationData = {
      event: 'message.created',
      documentId: new mongoose.Types.ObjectId().toString(),
      collection: 'messages',
      operationType: 'insert',
      payload: {
        fullDocument: { content: 'Test message' },
        resumeToken: 'abc123',
      },
    };

    const notification = await Notification.create(notificationData);
    
    expect(notification).toBeDefined();
    expect(notification.event).toBe('message.created');
    expect(notification.status).toBe('pending'); // Default value
    expect(notification.attempts).toBe(0); // Default value
    expect(notification.createdAt).toBeDefined();
    expect(notification.updatedAt).toBeDefined();
  });

  it('should validate required fields', async () => {
    const invalidNotification = new Notification({
      // Missing required fields
    });

    let validationError: any = null;
    try {
      await invalidNotification.validate();
    } catch (e) {
      validationError = e;
    }

    expect(validationError).toBeDefined();
    expect(validationError.errors.event).toBeDefined();
    expect(validationError.errors.documentId).toBeDefined();
    expect(validationError.errors.collection).toBeDefined();
    expect(validationError.errors.operationType).toBeDefined();
  });

  it('should update a notification successfully', async () => {
    const notification = await Notification.create({
      event: 'message.updated',
      documentId: new mongoose.Types.ObjectId().toString(),
      collection: 'messages',
      operationType: 'update',
      payload: { updateDescription: { updatedFields: { status: 'read' } } },
      status: 'pending',
    });

    await Notification.findByIdAndUpdate(notification._id, {
      status: 'completed',
      processedAt: new Date(),
    });

    const updatedNotification = await Notification.findById(notification._id);
    
    expect(updatedNotification).not.toBeNull();
    expect(updatedNotification!.status).toBe('completed');
    expect(updatedNotification!.processedAt).toBeDefined();
  });

  it('should convert to JSON correctly', async () => {
    const documentId = new mongoose.Types.ObjectId().toString();
    
    const notification = await Notification.create({
      event: 'queue.created',
      documentId,
      collection: 'queues',
      operationType: 'insert',
      payload: { fullDocument: { name: 'test-queue' } },
    });

    const json = notification.toJSON();
    
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.documentId).toBe(documentId);
  });
}); 