import { useEffect, useRef } from 'react';
import { chatApi } from '../supabase/chat.js';
import { ordersApi } from '../supabase/orders.js';

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => { try { ctx.close(); } catch (e) { console.error('ctx.close', e); } }, 700);
  } catch (e) { console.error('playNotificationSound', e); }
}

export function useRealtimeChat({ hasSupabase, supabaseReady, staffRole, user, setChatMessages }) {
  useEffect(() => {
    if (!hasSupabase || !supabaseReady) return;
    const sub = chatApi.subscribe(null, null, (msg) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const pendingIdx = prev.findIndex(m =>
          m.id !== msg.id
          && m.sender === msg.sender
          && m.text === msg.text
          && m.orderId === msg.orderId
          && m.customerEmail === msg.customerEmail
          && !m.timestamp
        );
        if (pendingIdx !== -1) {
          const updated = [...prev];
          updated[pendingIdx] = msg;
          return updated;
        }
        const isSelf = (msg.sender === 'admin' && staffRole) || (msg.sender === 'customer' && !staffRole);
        if (!isSelf) {
          playNotificationSound();
          try { window.dispatchEvent(new CustomEvent('thara:new-message', { detail: msg })); } catch (e) { console.error('dispatch new-message', e); }
        }
        return [...prev, msg];
      });
    });
    return () => sub.unsubscribe();
  }, [supabaseReady, staffRole, hasSupabase, setChatMessages]);
}

export function useRealtimeOrders({ hasSupabase, supabaseReady, staffRole, setOrders }) {
  useEffect(() => {
    if (!hasSupabase || !supabaseReady) return;
    const channel = ordersApi.subscribe(({ eventType, new: nextOrder, old: prevOrder }) => {
      setOrders(prev => {
        if (eventType === 'DELETE') {
          const id = String(prevOrder?.id || '');
          return prev.filter(o => o.id !== id);
        }
        if (!nextOrder) return prev;
        const exists = prev.find(o => o.id === nextOrder.id);
        if (exists) {
          return prev.map(o => o.id === nextOrder.id ? { ...o, ...nextOrder } : o);
        }
        if (eventType === 'INSERT') {
          try { window.dispatchEvent(new CustomEvent('thara:new-order', { detail: nextOrder })); } catch (e) { console.error('dispatch new-order', e); }
        }
        return [nextOrder, ...prev];
      });
      if (eventType === 'UPDATE' && prevOrder && nextOrder && prevOrder.status !== nextOrder.status) {
        try { window.dispatchEvent(new CustomEvent('thara:order-status', { detail: nextOrder })); } catch (e) { console.error('dispatch order-status', e); }
      }
    });
    return () => { try { channel.unsubscribe(); } catch (e) { console.error('channel.unsubscribe', e); } };
  }, [supabaseReady, staffRole, hasSupabase, setOrders]);
}

export function useTypingIndicator({ hasSupabase, supabaseReady, user, setTypingUsers }) {
  const typingTimeouts = useRef({});

  const sendTyping = (orderId, customerEmail) => {
    if (!hasSupabase || !supabaseReady || !user?.email) return;
    const key = orderId || customerEmail || user.email;
    chatApi.sendTyping(user.email, orderId, true).catch(e => console.error('sendTyping start', e));
    clearTimeout(typingTimeouts.current[key]);
    typingTimeouts.current[key] = setTimeout(() => {
      chatApi.sendTyping(user.email, orderId, false).catch(e => console.error('sendTyping stop', e));
    }, 2000);
  };

  useEffect(() => {
    if (!hasSupabase || !supabaseReady) return;
    const email = user?.email;
    if (!email) return;
    const sub = chatApi.subscribeTyping(null, null, ({ userEmail, orderId, isTyping }) => {
      if (userEmail === email) return;
      const tkey = orderId || userEmail;
      setTypingUsers(prev => {
        if (!isTyping) {
          const next = { ...prev };
          delete next[tkey];
          return next;
        }
        return { ...prev, [tkey]: true };
      });
      const timeoutKey = `typing_${tkey}`;
      clearTimeout(typingTimeouts.current[timeoutKey]);
      if (isTyping) {
        typingTimeouts.current[timeoutKey] = setTimeout(() => {
          setTypingUsers(prev => { const n = { ...prev }; delete n[tkey]; return n; });
        }, 4000);
      }
    });
    return () => { try { sub.unsubscribe(); } catch (e) { console.error('typing sub.unsubscribe', e); } };
  }, [supabaseReady, user, hasSupabase, setTypingUsers]);

  return { sendTyping, typingTimeouts };
}

export function useMessageStatus({ hasSupabase, supabaseReady, setChatMessages }) {
  useEffect(() => {
    if (!hasSupabase || !supabaseReady) return;
    const sub = chatApi.subscribeUpdates((msg) => {
      setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: msg.status, readAt: msg.readAt } : m));
    });
    return () => { try { sub.unsubscribe(); } catch (e) { console.error('msgStatus sub.unsubscribe', e); } };
  }, [supabaseReady, hasSupabase, setChatMessages]);
}

export function useMarkRead({ hasSupabase, supabaseReady, setChatMessages }) {
  const markMessagesAsRead = (messageIds) => {
    if (!messageIds || messageIds.length === 0 || !hasSupabase || !supabaseReady) return;
    chatApi.markAsRead(messageIds).catch(e => console.error('markAsRead', e));
    setChatMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, status: 'read' } : m));
  };
  return { markMessagesAsRead };
}
