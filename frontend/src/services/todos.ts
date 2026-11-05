import { xpService } from './xp';

export interface TodoItem {
  id: string;
  title: string;
  category: 'slides' | 'quiz' | 'reading' | 'review' | 'custom';
  completed: boolean;
  xpReward: number;
  createdAt: string;
  completedAt?: string;
  slideRange?: string;
  sourceDocTitle?: string;
}

const STORAGE_KEY = 'recall_study_todos';

const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'todo_1',
    title: 'Study Slides 1–8: Foundations & Core Models',
    category: 'slides',
    completed: false,
    xpReward: 10,
    slideRange: 'Slides 1–8',
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo_2',
    title: 'Complete 1 stepping stone on your Learning Path',
    category: 'quiz',
    completed: false,
    xpReward: 15,
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo_3',
    title: 'Run a 5-Minute "Just Start" focus sprint',
    category: 'review',
    completed: false,
    xpReward: 20,
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo_4',
    title: 'Review 5 spaced repetition flashcards due today',
    category: 'review',
    completed: false,
    xpReward: 10,
    createdAt: new Date().toISOString()
  }
];

class TodoService {
  public getTodos(): TodoItem[] {
    if (typeof window === 'undefined') return INITIAL_TODOS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        this.saveTodos(INITIAL_TODOS);
        return INITIAL_TODOS;
      }
      return JSON.parse(saved);
    } catch {
      return INITIAL_TODOS;
    }
  }

  private saveTodos(todos: TodoItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      window.dispatchEvent(new CustomEvent('recall:todos-changed', { detail: todos }));
    } catch {
      // ignore
    }
  }

  public addTodo(
    title: string,
    category: 'slides' | 'quiz' | 'reading' | 'review' | 'custom' = 'custom',
    xpReward: number = 10,
    slideRange?: string,
    sourceDocTitle?: string
  ): TodoItem {
    const todos = this.getTodos();
    const newTodo: TodoItem = {
      id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title,
      category,
      completed: false,
      xpReward,
      slideRange,
      sourceDocTitle,
      createdAt: new Date().toISOString()
    };
    const updated = [newTodo, ...todos];
    this.saveTodos(updated);
    return newTodo;
  }

  public toggleTodo(id: string): { todo: TodoItem; xpEarned: number } {
    const todos = this.getTodos();
    let xpEarned = 0;
    const updated = todos.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        if (nextCompleted) {
          xpEarned = t.xpReward;
          xpService.awardXp(t.xpReward, `Completed Task: ${t.title}`);
        }
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
      }
      return t;
    });
    this.saveTodos(updated);
    const target = updated.find(t => t.id === id)!;
    return { todo: target, xpEarned };
  }

  public deleteTodo(id: string): void {
    const todos = this.getTodos().filter(t => t.id !== id);
    this.saveTodos(todos);
  }

  public generateTasksFromDocument(docTitle: string, totalPages: number): TodoItem[] {
    const todos = this.getTodos();
    const slidesPerStone = 6;
    const numChunks = Math.min(15, Math.max(2, Math.round(totalPages / slidesPerStone)));
    const generated: TodoItem[] = [];

    for (let i = 0; i < numChunks; i++) {
      const startP = i * slidesPerStone + 1;
      const endP = Math.min(totalPages, (i + 1) * slidesPerStone);
      const range = startP === endP ? `Slide ${startP}` : `Slides ${startP}–${endP}`;
      const item: TodoItem = {
        id: 'todo_' + Date.now() + '_' + i,
        title: `Master ${range} of ${docTitle}`,
        category: 'slides',
        completed: false,
        xpReward: 15,
        slideRange: range,
        sourceDocTitle: docTitle,
        createdAt: new Date().toISOString()
      };
      generated.push(item);
    }

    const updated = [...generated, ...todos];
    this.saveTodos(updated);
    return generated;
  }
}

export const todoService = new TodoService();

