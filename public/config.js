const config = {
    supabaseUrl: "https://fowdecmskhvfgmdwwnxg.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvd2RlY21za2h2ZmdtZHd3bnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDE1MTk2MjUsImV4cCI6MjAxNzA5NTYyNX0.icC5QydnHRC-qu4Vf0Ik0_BxpaU39TCaU8bXijdqv9Y",
    // Socket.IO server configuration - automatically detects environment
    socketServerUrl: window.location.protocol === 'https:' ? 
        'https://origin-pge.onrender.com' : 
        'http://localhost:3000'
};
