import React, { useState, useEffect } from 'react';
import { Activity, ArrowRight, Hash, List, SendHorizontal } from 'lucide-react';
import apiService from '@/services/api';
import { CreateQueueRequest, CreateTopicRequest, SubscribeTopicRequest } from '@ozby-pubsub/types';
import {
  IQueue,
  IQueueMetrics,
  IServerMetrics,
  ITopic,
} from '@ozby-pubsub/types';
import NavBar from '@/components/NavBar';
import Sidebar from '@/components/Sidebar';
import MetricsCard from '@/components/MetricsCard';
import ServerMetricsComponent from '@/components/ServerMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import QueueForm from '@/components/QueueForm';
import TopicForm from '@/components/TopicForm';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queues, setQueues] = useState<IQueue[]>([]);
  const [topics, setTopics] = useState<ITopic[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<IQueueMetrics[]>([]);
  const [serverMetrics, setServerMetrics] = useState<IServerMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingQueue, setIsCreatingQueue] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [queuesData, topicsData, queueMetricsData, serverMetricsData] = await Promise.all([
          apiService.getQueues(),
          apiService.getTopics(),
          apiService.getAllQueueMetrics(),
          apiService.getServerMetrics(),
        ]);

        setQueues(queuesData);
        setTopics(topicsData);
        setQueueMetrics(queueMetricsData);
        setServerMetrics(serverMetricsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handleCreateQueue = async (values: CreateQueueRequest) => {
    try {
      setIsCreatingQueue(true);
      const newQueue = await apiService.createQueue(values);
      setQueues([...queues, newQueue]);
      toast.success(`Queue "${values.name}" created successfully`);
    } catch (error) {
      console.error('Failed to create queue', error);
      toast.error('Failed to create queue');
    } finally {
      setIsCreatingQueue(false);
    }
  };

  const handleCreateTopic = async (values: CreateTopicRequest, subscribers: string[]) => {
    try {
      setIsCreatingTopic(true);
      const newTopic = await apiService.createTopic(values);

      const subscribePromises = subscribers.map(queueId => {
        const subscribeRequest: SubscribeTopicRequest = { queueId };
        return apiService.subscribeTopic(newTopic.id, subscribeRequest);
      });

      await Promise.all(subscribePromises);

      const updatedTopics = await apiService.getTopics();
      setTopics(updatedTopics);

      toast.success(`Topic "${values.name}" created with ${subscribers.length} subscribers`);
    } catch (error) {
      console.error('Failed to create topic or subscribe queues', error);
      toast.error('Failed to create topic or add subscribers');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const totalMessages = queueMetrics.reduce((sum, metric) => sum + metric.messageCount, 0);
  const totalSent = queueMetrics.reduce((sum, metric) => sum + metric.messagesSent, 0);
  const totalReceived = queueMetrics.reduce((sum, metric) => sum + metric.messagesReceived, 0);
  
  const avgWaitTime = queueMetrics.length > 0
  ? queueMetrics.reduce((sum, metric) => sum + metric.avgWaitTime, 0) / queueMetrics.length
  : 0;
  console.log(totalMessages, totalSent, totalReceived, avgWaitTime);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <main className="pt-16 lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
              <p className="text-muted-foreground">
                Overview of your message queuing system
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QueueForm
                onSubmit={handleCreateQueue}
                isLoading={isCreatingQueue}
                trigger={
                  <Button variant="secondary">
                    <List className="mr-2 h-4 w-4" />
                    Create Queue
                  </Button>
                }
              />
              <TopicForm
                onSubmit={handleCreateTopic}
                isLoading={isCreatingTopic}
                availableQueues={queues.map(q => ({ id: q.id, name: q.name }))}
                trigger={
                  <Button>
                    <Hash className="mr-2 h-4 w-4" />
                    Create Topic
                  </Button>
                }
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-pulse">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="h-32">
                  <CardHeader className="p-4 pb-0">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricsCard
                title="Total Queues"
                value={queues.length}
                icon={List}
                description={`Active message queues in the system`}
                iconColor="text-indigo-500"
              />
              <MetricsCard
                title="Total Topics"
                value={topics.length}
                icon={Hash}
                description={`Publish/subscribe topics`}
                iconColor="text-pink-500"
              />
              <MetricsCard
                title="Total Messages"
                value={totalMessages.toLocaleString()}
                icon={SendHorizontal}
                description={`Messages currently in queues`}
                iconColor="text-blue-500"
              />
              <MetricsCard
                title="System Activity"
                value={`${serverMetrics?.activeConnections || 0} active`}
                icon={Activity}
                description={`${serverMetrics?.totalRequests.toLocaleString() || 0} total requests`}
                iconColor="text-green-500"
              />
            </div>
          )}

          {isLoading ? (
            <div className="animate-pulse space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </CardContent>
              </Card>
            </div>
          ) : serverMetrics ? (
            <ServerMetricsComponent metrics={serverMetrics} />
          ) : null}

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Queues</CardTitle>
                <CardDescription>Your recently created message queues</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="animate-pulse flex items-center justify-between">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : queues.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-muted-foreground">No queues created yet</p>
                    <QueueForm
                      onSubmit={handleCreateQueue}
                      isLoading={isCreatingQueue}
                      trigger={
                        <Button variant="outline" className="mt-4">
                          Create your first queue
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="divide-y">
                    {queues.slice(0, 5).map((queue) => (
                      <div key={queue.id} className="flex items-center justify-between p-4">
                        <div>
                          <h4 className="font-medium">{queue.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(queue.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/queues/${queue.id}`}>
                            View
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                    {queues.length > 5 && (
                      <div className="p-4 text-center">
                        <Button asChild variant="link">
                          <Link to="/queues">View all queues</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Topics</CardTitle>
                <CardDescription>Your recently created pub/sub topics</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="animate-pulse flex items-center justify-between">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-muted-foreground">No topics created yet</p>
                    <TopicForm
                      onSubmit={handleCreateTopic}
                      isLoading={isCreatingTopic}
                      availableQueues={queues.map(q => ({ id: q.id, name: q.name }))}
                      trigger={
                        <Button variant="outline" className="mt-4">
                          Create your first topic
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="divide-y">
                    {topics.slice(0, 5).map((topic) => (
                      <div key={topic.id} className="flex items-center justify-between p-4">
                        <div>
                          <h4 className="font-medium">{topic.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {topic.subscribedQueues.length} subscribed queues
                          </p>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/topics/${topic.id}`}>
                            View
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                    {topics.length > 5 && (
                      <div className="p-4 text-center">
                        <Button asChild variant="link">
                          <Link to="/topics">View all topics</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
