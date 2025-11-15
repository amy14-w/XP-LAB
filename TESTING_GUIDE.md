# Testing Guide for ClassLens Backend

## Quick Start Testing Options

### Option 1: FastAPI Auto-Generated Docs (Easiest) ⭐

1. Start your server:
   ```bash
   uvicorn app.main:app --reload
   ```

2. Open your browser to:
   ```
   http://localhost:8000/docs
   ```

3. You'll see interactive API documentation where you can:
   - Test all endpoints directly
   - See request/response schemas
   - Try endpoints with real data
   - See responses immediately

**This is the BEST option for quick testing!**

---

### Option 2: Simple Test Script

1. Make sure server is running
2. Run the test script:
   ```bash
   python test_api.py
   ```

This will test the basic flow:
- Register professor & student
- Create class & lecture
- Start lecture (get code)
- Student check-in
- Create question

---

### Option 3: HTML Test UI

1. Open `test_ui.html` in your browser
2. Make sure server is running on `http://localhost:8000`
3. Use the tabs to test:
   - **Professor**: Create classes, start lectures, log participation
   - **Student**: Check in, view profile
   - **Questions**: Create and trigger questions

---

## Testing Both Sides

You should test **BOTH** professor and student flows:

### Professor Flow Testing:
1. ✅ Register as professor
2. ✅ Create a class
3. ✅ Create a lecture
4. ✅ Start lecture (get 4-digit code)
5. ✅ Upload presentation (optional)
6. ✅ Create questions (AI/manual/hybrid)
7. ✅ Trigger questions
8. ✅ Log student participation
9. ✅ View analytics after lecture ends

### Student Flow Testing:
1. ✅ Register as student
2. ✅ Check in with lecture code
3. ✅ View profile (points, streaks, rank)
4. ✅ Answer questions (via WebSocket or API)
5. ✅ See question results

---

## Testing Checklist

### Basic API Tests:
- [ ] Health check (`GET /`)
- [ ] Register professor
- [ ] Register student
- [ ] Login (both roles)
- [ ] Create class
- [ ] Create lecture
- [ ] Start lecture (verify 4-digit code)
- [ ] Student check-in
- [ ] Create question (all 3 modes)
- [ ] Trigger question
- [ ] Submit answer
- [ ] Get question results
- [ ] Log participation
- [ ] Get student profile
- [ ] End lecture
- [ ] Get analytics

### Advanced Tests:
- [ ] WebSocket audio streaming
- [ ] Real-time question delivery (WebSocket)
- [ ] Timer countdown (20 seconds)
- [ ] Auto-reveal when all students answer
- [ ] AI question suggestions (every 15 min)
- [ ] Reject suggestion (+7 min delay)
- [ ] Excuse absence (maintain streak)
- [ ] Points and rank calculation

---

## Common Issues

### "Connection refused"
- Make sure server is running: `uvicorn app.main:app --reload`

### "Invalid credentials" / Auth errors
- Make sure Supabase is set up correctly
- Check your `.env` file has correct keys
- You may need to set up Supabase Auth first

### "Table doesn't exist"
- Run the `database_schema.sql` in Supabase SQL editor

### CORS errors
- The server already has CORS enabled for all origins
- If issues persist, check your browser console

---

## Recommended Testing Order

1. **Start with FastAPI docs** (`/docs`) - easiest way to test
2. **Test basic CRUD operations** (create, read, update)
3. **Test authentication flows**
4. **Test question system** (create, trigger, respond)
5. **Test WebSocket connections** (use a WebSocket client or browser console)
6. **Test full lecture flow** (start to finish)

---

## WebSocket Testing

For WebSocket endpoints, you can:

1. **Browser Console:**
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/questions/lectures/{lecture_id}/questions');
   ws.onmessage = (event) => console.log(JSON.parse(event.data));
   ```

2. **Online Tools:**
   - https://www.websocket.org/echo.html
   - Postman (supports WebSockets)

3. **Python Script:**
   ```python
   import asyncio
   import websockets
   
   async def test():
       async with websockets.connect('ws://localhost:8000/questions/lectures/{lecture_id}/questions') as ws:
           await ws.send('test')
           response = await ws.recv()
           print(response)
   
   asyncio.run(test())
   ```

---

## Next Steps

Once basic testing is done:
1. Test with multiple users (professor + multiple students)
2. Test concurrent questions
3. Test edge cases (invalid codes, expired lectures, etc.)
4. Test AI features (requires OpenAI API key)
5. Load testing (if needed)

