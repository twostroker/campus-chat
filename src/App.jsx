import React, { useState, useEffect, useRef } from 'react';
import { Send, UserCircle, Users, MessageCircle, X, RefreshCw, Hash, Sparkles } from 'lucide-react';

const SUPABASE_URL = 'https://qglfydfcnryomdolmtuk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnbGZ5ZGZjbnJ5b21kb2xtdHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMzg3OTQsImV4cCI6MjA3NzcxNDc5NH0.-RMW7vzU-NxuS8oMawOa13pkaGFO8z7sQOIJ0CYtoOQ';

const AVATAR_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

const THEMES = {
  gradient: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
  ocean: 'bg-gradient-to-br from-cyan-50 via-blue-100 to-indigo-100',
  sunset: 'bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50',
  forest: 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50'
};

class SupabaseClient {
  constructor(url, key) {
    this.url = url.replace(/\/$/, '');
    this.headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  }
  async select(table, columns = '*') {
    const response = await fetch(`${this.url}/rest/v1/${table}?select=${columns}`, { method: 'GET', headers: this.headers });
    return response.ok ? await response.json() : [];
  }
  async insert(table, data) {
    const response = await fetch(`${this.url}/rest/v1/${table}`, { method: 'POST', headers: this.headers, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  }
  async delete(table, filter) {
    const response = await fetch(`${this.url}/rest/v1/${table}?${filter}`, { method: 'DELETE', headers: this.headers });
    return response.ok;
  }
  async update(table, filter, data) {
    const response = await fetch(`${this.url}/rest/v1/${table}?${filter}`, { method: 'PATCH', headers: this.headers, body: JSON.stringify(data) });
    return response.ok;
  }
}

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <div key={i} className="absolute animate-confetti" style={{ left: `${Math.random() * 100}%`, top: '-10px', animationDelay: `${Math.random() * 3}s`, animationDuration: `${3 + Math.random() * 2}s` }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)] }} />
        </div>
      ))}
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white opacity-10 animate-float"
          style={{ width: `${Math.random() * 100 + 20}px`, height: `${Math.random() * 100 + 20}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 10}s`, animationDuration: `${15 + Math.random() * 15}s` }} />
      ))}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="flex-1 p-6 space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
          <div className="flex items-end gap-2 max-w-md">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="bg-gray-300 h-16 rounded-2xl" style={{ width: `${Math.random() * 100 + 150}px` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CampusChat() {
  const [username, setUsername] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerUsername, setPartnerUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [userId] = useState(() => 'u' + Date.now() + Math.random().toString(36).slice(2, 9));
  const [roomId, setRoomId] = useState(null);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userColor] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
  const [partnerColor] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
  const [theme, setTheme] = useState('gradient');
  const [isLoading, setIsLoading] = useState(false);

  const supabase = useRef(new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  const searchIntervalRef = useRef(null);
  const messageCheckRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  useEffect(() => {
    return () => {
      if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
      if (messageCheckRef.current) clearInterval(messageCheckRef.current);
    };
  }, []);
  
  useEffect(() => {
    const cleanup = async () => {
      try {
        await supabase.current.delete('waiting_users', `user_id=eq.${userId}`);
        if (roomId) await supabase.current.delete('active_rooms', `room_id=eq.${roomId}`);
      } catch (e) {}
    };
    window.addEventListener('beforeunload', cleanup);
    return () => { cleanup(); window.removeEventListener('beforeunload', cleanup); };
  }, [userId, roomId]);

  const startSearching = async () => {
    try {
      await supabase.current.insert('waiting_users', { user_id: userId, username: username, hashtags: hashtags.trim().toLowerCase() || null });
      searchIntervalRef.current = setInterval(() => findMatch(), 1000);
      findMatch();
    } catch (err) { console.error('Error starting search:', err); }
  };

  const findMatch = async () => {
    try {
      const rooms = await supabase.current.select('active_rooms');
      const myRoom = rooms.find(r => r.user1_id === userId || r.user2_id === userId);
      
      if (myRoom) {
        const partner = myRoom.user1_id === userId ? myRoom.user2_name : myRoom.user1_name;
        await supabase.current.delete('waiting_users', `user_id=eq.${userId}`);
        
        setRoomId(myRoom.room_id);
        setPartnerUsername(partner);
        setIsSearching(false);
        setIsLoading(true);
        
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
          setIsConnected(true);
          setIsLoading(false);
        }, 2000);

        if (searchIntervalRef.current) { clearInterval(searchIntervalRef.current); searchIntervalRef.current = null; }
        startMessageCheck(myRoom.room_id);
        return;
      }

      const waiting = await supabase.current.select('waiting_users');
      const others = waiting.filter(u => u.user_id !== userId);
      if (others.length === 0) return;

      const userHashtags = hashtags.trim().toLowerCase();
      let match = null;
      if (userHashtags) match = others.find(u => u.hashtags === userHashtags);
      if (!match) match = others.find(u => !u.hashtags);
      if (!match) match = others[0];

      const newRoomId = 'r' + Date.now() + Math.random().toString(36).slice(2, 7);

      await supabase.current.insert('active_rooms', { room_id: newRoomId, user1_id: userId, user1_name: username, user2_id: match.user_id, user2_name: match.username });
      await supabase.current.delete('waiting_users', `user_id=eq.${userId}`);
      await supabase.current.delete('waiting_users', `user_id=eq.${match.user_id}`);

      setRoomId(newRoomId);
      setPartnerUsername(match.username);
      setIsSearching(false);
      setIsLoading(true);
      
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setIsConnected(true);
        setIsLoading(false);
      }, 2000);

      if (searchIntervalRef.current) { clearInterval(searchIntervalRef.current); searchIntervalRef.current = null; }
      startMessageCheck(newRoomId);
    } catch (err) { console.error('Error in findMatch:', err); }
  };

  const startMessageCheck = (room) => {
    if (messageCheckRef.current) clearInterval(messageCheckRef.current);
    
    const check = async () => {
      try {
        const allMsgs = await supabase.current.select('messages');
        const roomMsgs = allMsgs.filter(m => m.room_id === room);
        
        if (roomMsgs.length > 0) {
          const sorted = roomMsgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          setMessages(sorted);
        }
        
        const rooms = await supabase.current.select('active_rooms');
        const currentRoom = rooms.find(r => r.room_id === room);
        
        if (!currentRoom) {
          if (messageCheckRef.current) { clearInterval(messageCheckRef.current); messageCheckRef.current = null; }
          setMessages(prev => [...prev, { room_id: room, sender_id: 'system', sender_name: 'System', message: `${partnerUsername} has disconnected`, created_at: new Date().toISOString() }]);
          setTimeout(() => { setIsConnected(false); setPartnerUsername(''); setMessages([]); setRoomId(null); }, 2000);
          return;
        }

        if (currentRoom.user1_id === userId) setPartnerTyping(currentRoom.user2_typing || false);
        else setPartnerTyping(currentRoom.user1_typing || false);
      } catch (err) { console.error('Error fetching messages:', err); }
    };
    
    check();
    messageCheckRef.current = setInterval(check, 500);
  };

  const handleTyping = async () => {
    if (!roomId) return;
    
    try {
      const rooms = await supabase.current.select('active_rooms');
      const room = rooms.find(r => r.room_id === roomId);
      if (room) {
        if (room.user1_id === userId) await supabase.current.update('active_rooms', `room_id=eq.${roomId}`, { user1_typing: true });
        else await supabase.current.update('active_rooms', `room_id=eq.${roomId}`, { user2_typing: true });
      }
    } catch (err) { console.error('Error updating typing status:', err); }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        const rooms = await supabase.current.select('active_rooms');
        const room = rooms.find(r => r.room_id === roomId);
        if (room) {
          if (room.user1_id === userId) await supabase.current.update('active_rooms', `room_id=eq.${roomId}`, { user1_typing: false });
          else await supabase.current.update('active_rooms', `room_id=eq.${roomId}`, { user2_typing: false });
        }
      } catch (err) { console.error('Error clearing typing status:', err); }
    }, 1000);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !isConnected || !roomId) return;
    
    const text = messageInput;
    setMessageInput('');

    try {
      await supabase.current.insert('messages', { room_id: roomId, sender_id: userId, sender_name: username, message: text });
      
      const rooms = await supabase.current.select('active_rooms');
      const room = rooms.find(r => r.room_id === roomId);
      if (room) {
        if (room.user1_id === userId) await supabase.current.update('active_rooms', `room_id=eq.${roomId}`, { user1_typing: false });
        else await supabase.current.update('active_rooms', `room_id=eq.${roomId}`, { user2_typing: false });
      }
    } catch (err) { console.error('Error sending message:', err); setMessageInput(text); }
  };

  const handleDisconnect = async () => {
    try {
      if (searchIntervalRef.current) { clearInterval(searchIntervalRef.current); searchIntervalRef.current = null; }
      if (messageCheckRef.current) { clearInterval(messageCheckRef.current); messageCheckRef.current = null; }
      await supabase.current.delete('waiting_users', `user_id=eq.${userId}`);
      if (roomId) {
        await supabase.current.delete('active_rooms', `room_id=eq.${roomId}`);
        await supabase.current.delete('messages', `room_id=eq.${roomId}`);
      }
    } catch (err) { console.error('Error during disconnect:', err); }
    finally { setIsSearching(false); setIsConnected(false); setPartnerUsername(''); setMessages([]); setRoomId(null); }
  };

  const handleLogout = async () => { await handleDisconnect(); setIsLoggedIn(false); setUsername(''); setHashtags(''); };
  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoggedIn) handleLogin(); else handleSendMessage(); } };
  const handleLogin = () => { if (username.trim()) setIsLoggedIn(true); };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen ${THEMES[theme]} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500`}>
        <FloatingParticles />
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-white/20 animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4 shadow-lg animate-bounce-slow">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Campus Chat</h1>
            <p className="text-gray-600">Connect with random students</p>
            
            <div className="flex justify-center gap-2 mt-4">
              {Object.keys(THEMES).map(t => (
                <button key={t} onClick={() => setTheme(t)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${theme === t ? 'border-indigo-600 scale-110' : 'border-gray-300'} ${
                    t === 'gradient' ? 'bg-gradient-to-br from-blue-400 to-purple-400' :
                    t === 'ocean' ? 'bg-gradient-to-br from-cyan-400 to-blue-400' :
                    t === 'sunset' ? 'bg-gradient-to-br from-orange-400 to-pink-400' :
                    'bg-gradient-to-br from-green-400 to-teal-400'}`} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose a username</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyPress={handleKeyPress}
                  placeholder="Enter your username" maxLength={20}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white/50 backdrop-blur" />
              </div>
            </div>

            <button onClick={handleLogin}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg">
              Start Chatting ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${THEMES[theme]} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500`}>
      <FloatingParticles />
      {showConfetti && <Confetti />}
      
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[700px] flex flex-col relative z-10 border border-white/20">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 rounded-t-3xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6" />
            <div>
              <h2 className="font-semibold text-sm md:text-base">Campus Chat</h2>
              <p className="text-xs text-indigo-100">{username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{partnerUsername}</span>
              </div>
            )}
            <button onClick={handleLogout} className="text-xs md:text-sm px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all">
              Logout
            </button>
          </div>
        </div>

        {!isSearching && !isConnected && !isLoading ? (
          <div className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="text-center w-full max-w-md">
              <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-6 animate-bounce-slow shadow-lg">
                <Users className="w-10 h-10 md:w-12 md:h-12 text-indigo-600" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">Ready to Connect?</h3>
              <p className="text-gray-600 mb-6 text-sm md:text-base">Find a random student to chat with</p>

              {showHashtagInput && (
                <div className="mb-6 text-left animate-fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interests/Hashtags (optional)</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input type="text" value={hashtags} onChange={(e) => setHashtags(e.target.value)}
                      placeholder="e.g., sports, coding, music"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white/70 backdrop-blur" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Users with matching hashtags will be prioritized</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button onClick={() => { setMessages([]); setShowHashtagInput(false); setIsSearching(true); startSearching(); }}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all inline-flex items-center justify-center gap-2 shadow-lg transform hover:scale-105">
                  <Sparkles className="w-5 h-5" />Find Someone to Chat
                </button>
                <button onClick={() => setShowHashtagInput(!showHashtagInput)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium inline-flex items-center justify-center gap-1 transition-all">
                  <Hash className="w-4 h-4" />{showHashtagInput ? 'Hide' : 'Add'} Interests
                </button>
              </div>
            </div>
          </div>
        ) : isSearching ? (
          <div className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="text-center">
              <div className="relative mb-8">
                <RefreshCw className="w-16 h-16 md:w-20 md:h-20 text-indigo-600 animate-spin mx-auto" />
                <div className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-indigo-200 animate-ping opacity-20" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">Looking for a match...</h3>
              <p className="text-gray-600 mb-2 text-sm md:text-base">Searching for available students</p>
              {hashtags && <p className="text-sm text-indigo-600 mb-6 font-medium bg-indigo-50 inline-block px-4 py-2 rounded-full">Prioritizing: {hashtags}</p>}
              <button onClick={handleDisconnect} className="text-gray-600 hover:text-gray-800 font-medium transition-all">Cancel</button>
            </div>
          </div>
        ) : isLoading ? (
          <>
            <div className="flex-1 bg-gradient-to-b from-gray-50/50 to-white/50 backdrop-blur overflow-hidden">
              <div className="p-4 md:p-6 text-center animate-fade-in">
                <div className="inline-flex items-center gap-3 bg-green-100 text-green-800 px-6 py-3 rounded-full font-semibold shadow-lg">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Matched with {partnerUsername}!</span>
                </div>
              </div>
              <SkeletonLoader />
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50 backdrop-blur">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-16 animate-fade-in">
                  <div className="inline-block p-6 bg-white/80 backdrop-blur rounded-2xl shadow-lg">
                    <p className="text-base md:text-lg mb-2">Say hi to {partnerUsername}! 👋</p>
                    <p className="text-sm text-gray-400">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => msg.sender_id === 'system' ? (
                  <div key={idx} className="flex justify-center animate-fade-in">
                    <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium shadow-md">{msg.message}</div>
                  </div>
                ) : (
                  <div key={idx} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'} animate-slide-in`}>
                    <div className={`flex items-end gap-2 max-w-[85%] md:max-w-md ${msg.sender_id === userId ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${msg.sender_id === userId ? userColor : partnerColor}`}>
                        {msg.sender_name[0].toUpperCase()}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl shadow-lg transition-all ${msg.sender_id === userId ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                        <p className="text-xs font-semibold mb-1 opacity-75">{msg.sender_name}</p>
                        <p className="break-words text-sm md:text-base">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {partnerTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-end gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${partnerColor}`}>
                      {partnerUsername[0].toUpperCase()}
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-lg border border-gray-100">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200/50 p-3 md:p-4 bg-white/80 backdrop-blur">
              <div className="flex gap-2 mb-3">
                <button onClick={handleDisconnect}
                  className="px-3 md:px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all flex items-center gap-2 text-xs md:text-sm font-medium shadow-md transform hover:scale-105">
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
                <button onClick={() => { handleDisconnect(); setTimeout(() => { setIsSearching(true); startSearching(); }, 400); }}
                  className="px-3 md:px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-xl hover:from-indigo-200 hover:to-purple-200 transition-all flex items-center gap-2 text-xs md:text-sm font-medium shadow-md transform hover:scale-105">
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">New Chat</span>
                </button>
              </div>

              <div className="flex gap-2">
                <input type="text" value={messageInput}
                  onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white/70 backdrop-blur shadow-sm text-sm md:text-base" />
                <button onClick={handleSendMessage} disabled={!messageInput.trim()}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 disabled:hover:scale-100">
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes confetti {
          0% { transform: translateY(0) rotateZ(0deg); }
          100% { transform: translateY(100vh) rotateZ(720deg); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}