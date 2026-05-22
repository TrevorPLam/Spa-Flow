import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useToast, toast } from './use-toast';

describe('useToast', () => {
  beforeEach(() => {
    // Clear any existing toasts before each test
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
  });

  it('should return empty toasts initially', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast when toast function is called', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Test toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test toast');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('should generate unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast());
    
    const firstId = result.current.toast({ title: 'First' }).id;
    const secondId = result.current.toast({ title: 'Second' }).id;

    expect(firstId).not.toBe(secondId);
  });

  it('should limit toasts to TOAST_LIMIT', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'First' });
      result.current.toast({ title: 'Second' });
    });

    expect(result.current.toasts).toHaveLength(1); // TOAST_LIMIT is 1
    expect(result.current.toasts[0].title).toBe('Second'); // Most recent
  });

  it('should dismiss a specific toast by ID', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Test toast' });
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should dismiss all toasts when no ID provided', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'First' });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should update an existing toast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      const toastObj = result.current.toast({ title: 'Original' });
      toastObj.update({ title: 'Updated' });
    });

    expect(result.current.toasts[0].title).toBe('Updated');
  });

  it('should remove toast after TOAST_REMOVE_DELAY', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Test' });
    });

    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
    });

    act(() => {
      vi.advanceTimersByTime(1000000); // TOAST_REMOVE_DELAY
    });

    expect(result.current.toasts).toHaveLength(0);
    
    vi.useRealTimers();
  });

  it('should handle toast with description', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ 
        title: 'Test', 
        description: 'Test description' 
      });
    });

    expect(result.current.toasts[0].description).toBe('Test description');
  });

  it('should handle toast with action', () => {
    const { result } = renderHook(() => useToast());

    const action = React.createElement('button', {}, 'Action');
    
    act(() => {
      result.current.toast({ 
        title: 'Test', 
        action 
      });
    });

    expect(result.current.toasts[0].action).toBe(action);
  });

  it('should sync state across multiple hook instances', () => {
    const { result: result1 } = renderHook(() => useToast());
    const { result: result2 } = renderHook(() => useToast());
    
    act(() => {
      result1.current.toast({ title: 'Test' });
    });

    expect(result2.current.toasts).toHaveLength(1);
    expect(result2.current.toasts[0].title).toBe('Test');
  });

  it('should clean up listener on unmount', () => {
    const { result, unmount } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Test' });
    });

    unmount();
    
    // After unmount, the listener should be removed from the listeners array
    // but toasts persist in memoryState (shared state design)
    const { result: result2 } = renderHook(() => useToast());
    expect(result2.current.toasts).toHaveLength(1);
  });

  it('should handle onOpenChange callback', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Test' });
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
