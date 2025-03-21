import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import apiService from '@/services/api';
import { IQueue, IQueueMetrics, IMessage } from '@ozby-pubsub/types';
import { SendMessageRequest } from '@ozby-pubsub/types';
import NavBar from '@/components/NavBar';
import Sidebar from '@/components/Sidebar';
import MessageList from '@/components/MessageList';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@repo/ui/components';
import { Button } from '@repo/ui/components';
import { Textarea } from '@repo/ui/components';
import { ArrowLeft, ArrowRight, RefreshCcw, SendHorizontal, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/components';
import { toast } from 'sonner';
import MetricsCard from '@/components/MetricsCard';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components';
import { Badge } from '@repo/ui/components';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components';

const QueueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queue, setQueue] = useState<IQueue | null>(null);
  const [metrics, setMetrics] = useState<IQueueMetrics | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageData, setMessageData] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoadingMessages(true);
      const messagesData = await apiService.receiveMessages(id, { maxMessages: 10 });
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to fetch messages', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [id]);

  useEffect(() => {
    const fetchQueueData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const [queueData, queueMetrics] = await Promise.all([
          apiService.getQueue(id),
          apiService.getQueueMetrics(id),
        ]);
        setQueue(queueData);
        setMetrics(queueMetrics);
        await fetchMessages();
      } catch (error) {
        console.error('Failed to fetch queue data', error);
        toast.error('Failed to load queue details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueueData();
  }, [id, fetchMessages]);

  const handleDeleteQueue = async () => {
    if (!id) return;
    
    try {
      setIsDeleting(true);
      await apiService.deleteQueue(id);
      toast.success('Queue deleted successfully');
      navigate('/queues');
    } catch (error) {
      console.error('Failed to delete queue', error);
      toast.error('Failed to delete queue');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSendMessage = async () => {
    if (!id || !messageData.trim()) return;
    
    try {
      setIsSendingMessage(true);
      
      let parsedData;
      try {
        parsedData = JSON.parse(messageData);
      } catch (error) {
        console.error('Invalid JSON format', error);
        toast.error('Invalid JSON format');
        return;
      }
      
      const payload: SendMessageRequest = { data: parsedData };
      await apiService.sendMessage(id, payload);
      toast.success('Message sent successfully');
      setMessageData('');
      await fetchMessages();
    } catch (error) {
      console.error('Failed to send message', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (queueId: string, messageId: string) => {
    try {
      await apiService.deleteMessage(queueId, messageId);
      setMessages(messages.filter(msg => msg.id !== messageId));
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Failed to delete message', error);
      toast.error('Failed to delete message');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <NavBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        
        <main className="pt-16 lg:pl-64">
          <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!queue) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <NavBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        
        <main className="pt-16 lg:pl-64">
          <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Queue not found or you don't have permission to view it.</AlertDescription>
            </Alert>
            <div className="mt-6">
              <Button asChild>
                <Link to="/queues">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Queues
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
      
      <main className="pt-16 lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="mb-4 sm:mb-0">
              <Button asChild variant="ghost" size="sm" className="mb-2">
                <Link to="/queues">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Queues
                </Link>
              </Button>
              <h1 className="text-3xl font-bold mb-1">{queue.name}</h1>
              <div className="flex items-center text-muted-foreground">
                <span>Created on {format(new Date(queue.createdAt), 'MMM d, yyyy')}</span>
                <span className="mx-2">•</span>
                <Badge variant="outline">{metrics?.messageCount || 0} messages</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchMessages()} disabled={isLoadingMessages}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Queue
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricsCard
                  title="Total Messages"
                  value={metrics?.messageCount || 0}
                  icon={SendHorizontal}
                />
                <MetricsCard
                  title="Messages Sent"
                  value={metrics?.messagesSent || 0}
                  icon={ArrowRight}
                  iconColor="text-green-500"
                />
                <MetricsCard
                  title="Messages Received"
                  value={metrics?.messagesReceived || 0}
                  icon={ArrowLeft}
                  iconColor="text-blue-500"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Queue ID</h4>
                        <p className="font-mono text-sm">{queue.id}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Owner ID</h4>
                        <p className="font-mono text-sm">{queue.ownerId}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Retention Period</h4>
                        <p>{queue.retentionPeriod} days</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Push Endpoint</h4>
                        <p>{queue.pushEndpoint || 'None'}</p>
                      </div>
                    </div>

                    {queue.schema && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Message Schema</h4>
                        <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(queue.schema, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Send Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder='{"example": "Enter your JSON message here"}'
                    className="font-mono resize-y h-32"
                    value={messageData}
                    onChange={(e) => setMessageData(e.target.value)}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !messageData.trim()}
                  >
                    <SendHorizontal className="mr-2 h-4 w-4" />
                    {isSendingMessage ? 'Sending...' : 'Send Message'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="messages" className="animate-fade-in">
              <MessageList
                messages={messages}
                onDelete={handleDeleteMessage}
                isLoading={isLoadingMessages}
              />
            </TabsContent>
            
            <TabsContent value="settings" className="animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Queue Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Manage settings for this queue. Changes to queue settings may affect how messages are processed.
                  </p>
                  
                  <div className="space-y-6">
                    {/* Settings would go here - not implemented in this version */}
                    <p>Queue settings functionality will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Queue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the queue "{queue.name}"? This action cannot be undone and will delete all associated messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteQueue}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Queue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QueueDetail;
