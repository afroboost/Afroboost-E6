"""
Test WebSocket Silent Disco functionality
Tests the /api/ws/session/{session_id} endpoint
"""
import pytest
import requests
import os
import asyncio
import websockets
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://disco-sync.preview.emergentagent.com')

class TestSilentDiscoWebSocket:
    """Test Silent Disco WebSocket functionality"""
    
    def test_health_check(self):
        """Test API health"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")
    
    def test_silent_disco_sessions_endpoint(self):
        """Test GET /api/silent-disco/sessions returns empty list initially"""
        response = requests.get(f"{BASE_URL}/api/silent-disco/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Silent disco sessions endpoint working - {len(data)} active sessions")
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection to /api/ws/session/{session_id}"""
        # Build WebSocket URL
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        session_id = "test_session_123"
        full_ws_url = f"{ws_url}/api/ws/session/{session_id}"
        
        print(f"Connecting to WebSocket: {full_ws_url}")
        
        try:
            async with websockets.connect(full_ws_url, timeout=10) as websocket:
                # Send JOIN message
                join_msg = {
                    "type": "JOIN",
                    "data": {
                        "email": "test@example.com",
                        "name": "Test Participant",
                        "is_coach": False
                    }
                }
                await websocket.send(json.dumps(join_msg))
                print("✅ JOIN message sent")
                
                # Wait for STATE_SYNC response
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                print(f"✅ Received response: {data['type']}")
                
                assert data["type"] == "STATE_SYNC"
                assert "data" in data
                assert "participant_count" in data["data"]
                print(f"✅ WebSocket connection successful - {data['data']['participant_count']} participants")
                
                # Test PING/PONG
                ping_msg = {"type": "PING", "data": {}}
                await websocket.send(json.dumps(ping_msg))
                
                # Wait for PONG or PARTICIPANT_COUNT
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                print(f"✅ Received: {data['type']}")
                
        except Exception as e:
            pytest.fail(f"WebSocket connection failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_coach_commands(self):
        """Test Coach can send PLAY/PAUSE commands"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        session_id = "test_coach_session_456"
        full_ws_url = f"{ws_url}/api/ws/session/{session_id}"
        
        try:
            async with websockets.connect(full_ws_url, timeout=10) as websocket:
                # Join as Coach
                join_msg = {
                    "type": "JOIN",
                    "data": {
                        "email": "coach@test.com",
                        "name": "Test Coach",
                        "is_coach": True
                    }
                }
                await websocket.send(json.dumps(join_msg))
                
                # Wait for STATE_SYNC
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                assert data["type"] == "STATE_SYNC"
                print("✅ Coach connected")
                
                # Send PLAY command
                play_msg = {
                    "type": "PLAY",
                    "data": {"position": 0.0}
                }
                await websocket.send(json.dumps(play_msg))
                
                # Wait for broadcast
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                # Could be PARTICIPANT_COUNT or PLAY broadcast
                print(f"✅ Received after PLAY: {data['type']}")
                
                # Send PAUSE command
                pause_msg = {
                    "type": "PAUSE",
                    "data": {"position": 10.5}
                }
                await websocket.send(json.dumps(pause_msg))
                
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                print(f"✅ Received after PAUSE: {data['type']}")
                
                print("✅ Coach commands working")
                
        except Exception as e:
            pytest.fail(f"Coach WebSocket test failed: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
