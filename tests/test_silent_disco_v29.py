"""
Test Suite for Silent Disco Features - Iteration 29
Tests:
1. WebSocket global /api/ws/notifications functionality
2. GET /api/silent-disco/active-sessions endpoint
3. Code review: audioContext.resume() NOT in PLAY handler
4. Code review: TWINT in payment_methods
5. Code review: Audio unlock only at joinLiveSession click
6. Code review: liveCourseImage conditional rendering (no black space)
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSilentDiscoWebSocket:
    """Tests for WebSocket global notifications endpoint"""
    
    def test_active_sessions_endpoint_returns_correct_structure(self):
        """Test GET /api/silent-disco/active-sessions returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/silent-disco/active-sessions")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_active" in data, "Response should contain 'has_active' field"
        assert "active_sessions" in data, "Response should contain 'active_sessions' field"
        assert isinstance(data["has_active"], bool), "has_active should be boolean"
        assert isinstance(data["active_sessions"], list), "active_sessions should be list"
        print(f"✅ active-sessions endpoint returns: has_active={data['has_active']}, sessions={len(data['active_sessions'])}")
    
    def test_api_root_accessible(self):
        """Test API root is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ API root accessible: {data['message']}")


class TestCodeReviewPLAYHandler:
    """Code review tests for PLAY handler - audioContext.resume() should NOT be present"""
    
    def test_play_handler_no_audio_context_resume(self):
        """Verify PLAY handler does NOT call audioContext.resume()"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Find the PLAY case handler (lines 1114-1180 approximately)
        play_handler_match = re.search(
            r'case "PLAY":(.*?)(?=case "|break;)',
            content,
            re.DOTALL
        )
        
        assert play_handler_match, "PLAY handler not found in App.js"
        play_handler_code = play_handler_match.group(1)
        
        # Check that audioContext.resume() is NOT called in PLAY handler
        # It should only have a comment mentioning it's NOT called here
        has_resume_call = re.search(r'audioContext(?:Ref)?\.current\.resume\(\)', play_handler_code)
        has_comment_about_resume = "audioContext.resume()" in play_handler_code and "UNIQUEMENT au clic" in play_handler_code
        
        assert not has_resume_call, "PLAY handler should NOT call audioContext.resume()"
        assert has_comment_about_resume, "PLAY handler should have comment explaining audioContext.resume() is only at click"
        print("✅ PLAY handler does NOT call audioContext.resume() - only comment present")
    
    def test_play_handler_comment_present(self):
        """Verify PLAY handler has correct comment about mobile restrictions"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Check for the specific comment
        expected_comment = "audioContext.resume() est appelé UNIQUEMENT au clic physique"
        assert expected_comment in content, f"Expected comment not found: {expected_comment}"
        print("✅ Comment about audioContext.resume() at physical click is present")


class TestCodeReviewAudioUnlock:
    """Code review tests for audio unlock - should only be at joinLiveSession click"""
    
    def test_audio_unlock_at_join_live_session(self):
        """Verify unlockAudioForMobile and forceAudioPlay are called in joinLiveSession"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Find joinLiveSession function
        join_session_match = re.search(
            r'const joinLiveSession = useCallback\(async \(sessionId.*?\n\s*\}, \[',
            content,
            re.DOTALL
        )
        
        assert join_session_match, "joinLiveSession function not found"
        join_session_code = join_session_match.group(0)
        
        # Check that audio unlock functions are called
        assert "unlockAudioForMobile()" in join_session_code, "unlockAudioForMobile should be called in joinLiveSession"
        assert "forceAudioPlay()" in join_session_code, "forceAudioPlay should be called in joinLiveSession"
        print("✅ Audio unlock (unlockAudioForMobile, forceAudioPlay) called in joinLiveSession")
    
    def test_audio_unlock_only_when_not_reconnect(self):
        """Verify audio unlock is only called when NOT reconnecting"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Check for the condition
        assert "if (!isReconnect)" in content, "Audio unlock should be conditional on !isReconnect"
        print("✅ Audio unlock is conditional on !isReconnect (physical click only)")


class TestCodeReviewTWINT:
    """Code review tests for TWINT payment method"""
    
    def test_twint_in_payment_methods(self):
        """Verify TWINT is configured in payment_methods"""
        server_py_path = "/app/backend/server.py"
        
        with open(server_py_path, 'r') as f:
            content = f.read()
        
        # Check for payment_methods with twint
        twint_match = re.search(r'payment_methods\s*=\s*\[.*?["\']twint["\'].*?\]', content)
        assert twint_match, "TWINT should be in payment_methods array"
        print(f"✅ TWINT configured in payment_methods: {twint_match.group(0)}")


class TestCodeReviewLiveThumbnail:
    """Code review tests for live thumbnail conditional rendering"""
    
    def test_live_thumbnail_conditional_rendering(self):
        """Verify live thumbnail is conditionally rendered (no black space when empty)"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Check for conditional rendering of thumbnail
        conditional_render = "liveCourseImage && liveCourseImage.trim() !== ''"
        assert conditional_render in content, "Live thumbnail should have conditional rendering"
        print("✅ Live thumbnail uses conditional rendering: liveCourseImage && liveCourseImage.trim() !== ''")
    
    def test_live_thumbnail_comment_present(self):
        """Verify comment about thumbnail being removed from DOM when empty"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Check for the comment
        expected_comment = "SUPPRIMÉ DU DOM si vide"
        assert expected_comment in content, f"Expected comment not found: {expected_comment}"
        print("✅ Comment about thumbnail removal from DOM is present")


class TestCodeReviewWebSocketGlobal:
    """Code review tests for WebSocket global implementation"""
    
    def test_websocket_global_connection_code(self):
        """Verify WebSocket global connection code exists"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Check for WebSocket global connection
        assert "/api/ws/notifications" in content, "WebSocket global URL should be present"
        assert "SESSION_START" in content, "SESSION_START event handling should be present"
        assert "SESSION_END" in content, "SESSION_END event handling should be present"
        assert "NO_ACTIVE_SESSION" in content, "NO_ACTIVE_SESSION event handling should be present"
        print("✅ WebSocket global connection code present with SESSION_START/SESSION_END/NO_ACTIVE_SESSION")
    
    def test_no_polling_for_active_sessions(self):
        """Verify there's no polling interval for active-sessions (replaced by WebSocket)"""
        app_js_path = "/app/frontend/src/App.js"
        
        with open(app_js_path, 'r') as f:
            content = f.read()
        
        # Check that there's no setInterval for active-sessions polling
        # The old code had: setInterval(() => { fetch(...active-sessions...) }, 5000)
        polling_pattern = re.search(r'setInterval\([^)]*active-sessions[^)]*\)', content)
        assert not polling_pattern, "Should NOT have setInterval polling for active-sessions"
        print("✅ No polling interval for active-sessions (WebSocket replaces polling)")


class TestBackendNotificationManager:
    """Tests for backend NotificationManager"""
    
    def test_notification_manager_exists(self):
        """Verify NotificationManager class exists in server.py"""
        server_py_path = "/app/backend/server.py"
        
        with open(server_py_path, 'r') as f:
            content = f.read()
        
        assert "class NotificationManager:" in content, "NotificationManager class should exist"
        assert "notification_manager = NotificationManager()" in content, "notification_manager instance should exist"
        print("✅ NotificationManager class and instance exist")
    
    def test_websocket_notifications_endpoint_exists(self):
        """Verify WebSocket notifications endpoint exists"""
        server_py_path = "/app/backend/server.py"
        
        with open(server_py_path, 'r') as f:
            content = f.read()
        
        assert '@app.websocket("/api/ws/notifications")' in content, "WebSocket notifications endpoint should exist"
        print("✅ WebSocket /api/ws/notifications endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
