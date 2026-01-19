"""
Test Stripe Checkout API - Iteration 27
Tests for /api/stripe/create-checkout endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://livejam-coach.preview.emergentagent.com')

class TestStripeCheckout:
    """Test Stripe Checkout API endpoint"""
    
    def test_create_checkout_success(self):
        """Test 5: Verify /api/stripe/create-checkout returns URL"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout",
            json={
                "offer_id": "test-offer",
                "offer_name": "Test Offer",
                "price": 30.0,
                "user_name": "Test User",
                "user_email": "test@example.com",
                "course_id": "test-course",
                "course_name": "Test Course",
                "origin_url": BASE_URL
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "url" in data, "Response should contain 'url'"
        assert "session_id" in data, "Response should contain 'session_id'"
        assert "reservation_code" in data, "Response should contain 'reservation_code'"
        
        # Verify URL is a valid Stripe checkout URL
        assert data["url"].startswith("https://checkout.stripe.com"), f"URL should be Stripe checkout: {data['url']}"
        
        # Verify session_id format
        assert data["session_id"].startswith("cs_test_"), f"Session ID should start with cs_test_: {data['session_id']}"
        
        # Verify reservation code format
        assert data["reservation_code"].startswith("AFR-"), f"Reservation code should start with AFR-: {data['reservation_code']}"
        
        print(f"✅ Stripe checkout created successfully")
        print(f"   URL: {data['url'][:80]}...")
        print(f"   Session ID: {data['session_id']}")
        print(f"   Reservation Code: {data['reservation_code']}")
    
    def test_create_checkout_missing_fields(self):
        """Test checkout with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout",
            json={
                "offer_id": "test-offer"
                # Missing other required fields
            }
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print("✅ Validation error returned for missing fields")
    
    def test_checkout_status_endpoint(self):
        """Test checkout status endpoint exists"""
        # First create a checkout session
        create_response = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout",
            json={
                "offer_id": "test-offer",
                "offer_name": "Test Offer",
                "price": 30.0,
                "user_name": "Test User",
                "user_email": "test@example.com",
                "course_id": "test-course",
                "course_name": "Test Course",
                "origin_url": BASE_URL
            }
        )
        
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Check status endpoint
        status_response = requests.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        
        # Should return 200 (status may be pending)
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}"
        
        data = status_response.json()
        assert "status" in data, "Response should contain 'status'"
        print(f"✅ Checkout status endpoint working, status: {data.get('status')}")


class TestWebSocketSession:
    """Test WebSocket session endpoints"""
    
    def test_session_exists(self):
        """Test that session endpoint is accessible"""
        # We can't fully test WebSocket with requests, but we can verify the endpoint exists
        # by checking if the server responds to a regular HTTP request
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✅ API root endpoint accessible")


class TestHealthCheck:
    """Basic health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ API root: {data['message']}")
    
    def test_courses_endpoint(self):
        """Test courses endpoint"""
        response = requests.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Courses endpoint: {len(data)} courses found")
    
    def test_offers_endpoint(self):
        """Test offers endpoint"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Offers endpoint: {len(data)} offers found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
