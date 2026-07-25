import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'member' | 'viewer'
}

export interface Meeting {
  id: string
  title: string
  date: string
  duration: number
  participants: string[]
  transcript: string
  summary: string
  decisions: string[]
  actionItems: ActionItem[]
  risks: string[]
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
}

export interface ActionItem {
  id: string
  title: string
  owner: string
  deadline: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  meetingId: string
}

export interface Task {
  id: string
  title: string
  description: string
  assignee: string
  dueDate: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  createdAt: string
}

export interface Agent {
  id: string
  name: string
  type: 'transcriber' | 'summarizer' | 'analyzer' | 'scheduler' | 'researcher'
  status: 'idle' | 'running' | 'completed' | 'error'
  lastRun?: string
  confidence?: number
}

export interface AgentStatus {
  agentId: string
  status: Agent['status']
  progress: number
  message?: string
  startedAt?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

interface MeetingsState {
  meetings: Meeting[]
  activeMeeting: Meeting | null
  addMeeting: (meeting: Meeting) => void
  updateMeeting: (id: string, updates: Partial<Meeting>) => void
  setActiveMeeting: (meeting: Meeting | null) => void
  removeMeeting: (id: string) => void
}

interface TasksState {
  tasks: Task[]
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  completeTask: (id: string) => void
  removeTask: (id: string) => void
}

interface AgentsState {
  agents: Agent[]
  agentStatuses: Record<string, AgentStatus>
  updateAgentStatus: (agentId: string, status: Partial<AgentStatus>) => void
  setAgents: (agents: Agent[]) => void
}

interface UIState {
  sidebarOpen: boolean
  theme: 'dark' | 'light'
  toggleSidebar: () => void
  setTheme: (theme: 'dark' | 'light') => void
}

export type AppStore = AuthState & MeetingsState & TasksState & AgentsState & UIState

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),

      meetings: [],
      activeMeeting: null,
      addMeeting: (meeting) =>
        set((state) => ({ meetings: [...state.meetings, meeting] })),
      updateMeeting: (id, updates) =>
        set((state) => ({
          meetings: state.meetings.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
          activeMeeting:
            state.activeMeeting?.id === id
              ? { ...state.activeMeeting, ...updates }
              : state.activeMeeting,
        })),
      setActiveMeeting: (meeting) => set({ activeMeeting: meeting }),
      removeMeeting: (id) =>
        set((state) => ({
          meetings: state.meetings.filter((m) => m.id !== id),
          activeMeeting:
            state.activeMeeting?.id === id ? null : state.activeMeeting,
        })),

      tasks: [],
      addTask: (task) =>
        set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      completeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status: 'done' as const } : t
          ),
        })),
      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      agents: [],
      agentStatuses: {},
      updateAgentStatus: (agentId, status) =>
        set((state) => ({
          agentStatuses: {
            ...state.agentStatuses,
            [agentId]: {
              ...state.agentStatuses[agentId],
              ...status,
              agentId,
            },
          },
        })),
      setAgents: (agents) => set({ agents }),

      sidebarOpen: true,
      theme: 'dark',
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'cortex-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
