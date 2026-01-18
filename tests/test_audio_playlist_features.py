"""
Test suite for Audio/Playlist management features:
1. Email authorization change (contact.artboost@gmail.com)
2. Course model with playlist field
3. PUT /api/courses/{id} with playlist persistence
4. GET /api/coach-auth returns correct email
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCoachAuthEmail:
    """Test that authorized email has been changed to contact.artboost@gmail.com"""
    
    def test_coach_auth_returns_correct_email(self):
        """GET /api/coach-auth should return contact.artboost@gmail.com"""
        response = requests.get(f"{BASE_URL}/api/coach-auth")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == "contact.artboost@gmail.com", f"Expected contact.artboost@gmail.com, got {data['email']}"
        print(f"✅ Coach auth email is correctly set to: {data['email']}")
    
    def test_old_email_not_authorized(self):
        """Verify old email coach@afroboost.com is no longer the default"""
        response = requests.get(f"{BASE_URL}/api/coach-auth")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] != "coach@afroboost.com", "Old email should not be authorized"
        print("✅ Old email coach@afroboost.com is no longer the default")


class TestCoursePlaylistModel:
    """Test Course model with playlist field"""
    
    @pytest.fixture
    def test_course_id(self):
        """Create a test course and return its ID"""
        course_data = {
            "name": f"TEST_Playlist_Course_{uuid.uuid4().hex[:6]}",
            "weekday": 1,
            "time": "19:00",
            "locationName": "Test Location",
            "mapsUrl": "",
            "visible": True,
            "archived": False,
            "playlist": []
        }
        response = requests.post(f"{BASE_URL}/api/courses", json=course_data)
        assert response.status_code == 200
        course = response.json()
        yield course["id"]
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course['id']}")
    
    def test_create_course_with_playlist(self):
        """POST /api/courses should accept playlist field"""
        course_data = {
            "name": f"TEST_Course_With_Playlist_{uuid.uuid4().hex[:6]}",
            "weekday": 2,
            "time": "18:30",
            "locationName": "Test Location",
            "mapsUrl": "",
            "visible": True,
            "playlist": ["https://example.com/track1.mp3", "https://example.com/track2.mp3"]
        }
        response = requests.post(f"{BASE_URL}/api/courses", json=course_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["playlist"] == course_data["playlist"], "Playlist should be saved on creation"
        print(f"✅ Course created with playlist: {data['playlist']}")
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{data['id']}")
    
    def test_update_course_with_playlist(self, test_course_id):
        """PUT /api/courses/{id} should persist playlist URLs"""
        playlist_urls = [
            "https://soundcloud.com/test/track1",
            "https://spotify.com/track/abc123",
            "https://example.com/music.mp3"
        ]
        
        # Update course with playlist
        update_data = {"playlist": playlist_urls}
        response = requests.put(f"{BASE_URL}/api/courses/{test_course_id}", json=update_data)
        assert response.status_code == 200
        updated = response.json()
        assert updated["playlist"] == playlist_urls, f"Playlist not saved correctly. Got: {updated.get('playlist')}"
        print(f"✅ Playlist updated successfully: {updated['playlist']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/courses")
        assert get_response.status_code == 200
        courses = get_response.json()
        test_course = next((c for c in courses if c["id"] == test_course_id), None)
        assert test_course is not None, "Test course not found"
        assert test_course["playlist"] == playlist_urls, "Playlist not persisted in database"
        print("✅ Playlist persisted correctly in database")
    
    def test_update_course_empty_playlist(self, test_course_id):
        """PUT /api/courses/{id} with empty playlist should work"""
        # First add some URLs
        requests.put(f"{BASE_URL}/api/courses/{test_course_id}", json={"playlist": ["https://test.com/a.mp3"]})
        
        # Then clear the playlist
        response = requests.put(f"{BASE_URL}/api/courses/{test_course_id}", json={"playlist": []})
        assert response.status_code == 200
        updated = response.json()
        assert updated["playlist"] == [], "Empty playlist should be saved"
        print("✅ Empty playlist saved correctly")
    
    def test_partial_update_preserves_other_fields(self, test_course_id):
        """PUT /api/courses/{id} with only playlist should not affect other fields"""
        # Get original course
        get_response = requests.get(f"{BASE_URL}/api/courses")
        courses = get_response.json()
        original = next((c for c in courses if c["id"] == test_course_id), None)
        original_name = original["name"]
        original_time = original["time"]
        
        # Update only playlist
        response = requests.put(f"{BASE_URL}/api/courses/{test_course_id}", json={"playlist": ["https://new.com/track.mp3"]})
        assert response.status_code == 200
        updated = response.json()
        
        # Verify other fields unchanged
        assert updated["name"] == original_name, "Name should not change"
        assert updated["time"] == original_time, "Time should not change"
        assert updated["playlist"] == ["https://new.com/track.mp3"], "Playlist should be updated"
        print("✅ Partial update preserves other fields")


class TestCoursesAPI:
    """Test general courses API functionality"""
    
    def test_get_courses(self):
        """GET /api/courses should return list of courses"""
        response = requests.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/courses returned {len(data)} courses")
    
    def test_courses_have_playlist_field(self):
        """All courses should have playlist field (even if null/empty)"""
        response = requests.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        courses = response.json()
        
        # Check that playlist field exists or is handled
        for course in courses:
            # playlist can be None, [], or list of URLs
            playlist = course.get("playlist")
            assert playlist is None or isinstance(playlist, list), f"Invalid playlist type for course {course['id']}"
        print("✅ All courses have valid playlist field")


class TestHealthAndBasicEndpoints:
    """Test basic API health and endpoints"""
    
    def test_health_check(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Health check passed")
    
    def test_api_root(self):
        """API root should return message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✅ API root accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
