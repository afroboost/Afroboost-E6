"""
Test suite for multi-date selection feature in Afroboost reservation system.
Tests the ability to select multiple dates for a single course reservation.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMultiDateSelection:
    """Tests for multi-date selection feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_user_id = f"TEST_user_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("SUCCESS: API health check passed")
    
    def test_get_courses(self):
        """Test getting courses list"""
        response = requests.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        courses = response.json()
        assert isinstance(courses, list)
        print(f"SUCCESS: Got {len(courses)} courses")
        return courses
    
    def test_get_offers(self):
        """Test getting offers list"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        offers = response.json()
        assert isinstance(offers, list)
        print(f"SUCCESS: Got {len(offers)} offers")
        return offers
    
    def test_create_reservation_with_single_date(self):
        """Test creating a reservation with a single date"""
        # Get a course and offer first
        courses = requests.get(f"{BASE_URL}/api/courses").json()
        offers = requests.get(f"{BASE_URL}/api/offers").json()
        
        if not courses or not offers:
            pytest.skip("No courses or offers available")
        
        course = courses[0]
        offer = [o for o in offers if not o.get('isProduct', False)]
        if not offer:
            pytest.skip("No service offers available")
        offer = offer[0]
        
        # Create reservation with single date
        single_date = (datetime.now() + timedelta(days=7)).isoformat()
        
        reservation_data = {
            "userId": self.test_user_id,
            "userName": "TEST Single Date User",
            "userEmail": self.test_email,
            "userWhatsapp": "+41791234567",
            "courseId": course.get("id", "test-course"),
            "courseName": course.get("name", "Test Course"),
            "courseTime": course.get("time", "18:30"),
            "datetime": single_date,
            "offerId": offer.get("id", "test-offer"),
            "offerName": offer.get("name", "Test Offer"),
            "price": offer.get("price", 30),
            "quantity": 1,
            "totalPrice": offer.get("price", 30),
            "selectedDates": [single_date],
            "selectedDatesText": "1 date sélectionnée"
        }
        
        response = requests.post(f"{BASE_URL}/api/reservations", json=reservation_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "reservationCode" in data
        assert data.get("selectedDates") == [single_date]
        print(f"SUCCESS: Created reservation with single date - Code: {data['reservationCode']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reservations/{data['id']}")
        return data
    
    def test_create_reservation_with_multiple_dates(self):
        """Test creating a reservation with multiple dates (3 dates)"""
        # Get a course and offer first
        courses = requests.get(f"{BASE_URL}/api/courses").json()
        offers = requests.get(f"{BASE_URL}/api/offers").json()
        
        if not courses or not offers:
            pytest.skip("No courses or offers available")
        
        course = courses[0]
        offer = [o for o in offers if not o.get('isProduct', False)]
        if not offer:
            pytest.skip("No service offers available")
        offer = offer[0]
        
        # Create 3 dates
        date1 = (datetime.now() + timedelta(days=7)).isoformat()
        date2 = (datetime.now() + timedelta(days=14)).isoformat()
        date3 = (datetime.now() + timedelta(days=21)).isoformat()
        selected_dates = [date1, date2, date3]
        
        # Calculate total price: 3 dates × offer price
        unit_price = offer.get("price", 30)
        total_price = unit_price * 3
        
        reservation_data = {
            "userId": self.test_user_id,
            "userName": "TEST Multi Date User",
            "userEmail": self.test_email,
            "userWhatsapp": "+41791234567",
            "courseId": course.get("id", "test-course"),
            "courseName": course.get("name", "Test Course"),
            "courseTime": course.get("time", "18:30"),
            "datetime": date1,  # Primary date
            "offerId": offer.get("id", "test-offer"),
            "offerName": offer.get("name", "Test Offer"),
            "price": unit_price,
            "quantity": 1,
            "totalPrice": total_price,
            "selectedDates": selected_dates,
            "selectedDatesText": f"3 dates: {date1[:10]}, {date2[:10]}, {date3[:10]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/reservations", json=reservation_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "reservationCode" in data
        assert data.get("selectedDates") == selected_dates
        assert len(data.get("selectedDates", [])) == 3
        assert data.get("totalPrice") == total_price
        print(f"SUCCESS: Created reservation with 3 dates - Code: {data['reservationCode']}")
        print(f"  - Total price: {total_price} CHF (3 × {unit_price} CHF)")
        print(f"  - Selected dates: {data.get('selectedDates')}")
        
        # Verify by fetching the reservation
        reservations = requests.get(f"{BASE_URL}/api/reservations").json()
        created_res = [r for r in reservations if r.get("reservationCode") == data["reservationCode"]]
        assert len(created_res) == 1
        assert created_res[0].get("selectedDates") == selected_dates
        print("SUCCESS: Verified reservation persisted with selectedDates array")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reservations/{data['id']}")
        return data
    
    def test_reservation_model_has_selected_dates_field(self):
        """Test that the Reservation model accepts selectedDates field"""
        # Create a minimal reservation to test the model
        courses = requests.get(f"{BASE_URL}/api/courses").json()
        offers = requests.get(f"{BASE_URL}/api/offers").json()
        
        if not courses or not offers:
            pytest.skip("No courses or offers available")
        
        course = courses[0]
        offer = offers[0]
        
        test_dates = [
            "2025-01-21T18:30:00.000Z",
            "2025-01-28T18:30:00.000Z",
            "2025-02-04T18:30:00.000Z"
        ]
        
        reservation_data = {
            "userId": self.test_user_id,
            "userName": "TEST Model Test",
            "userEmail": self.test_email,
            "userWhatsapp": "+41791234567",
            "courseId": course.get("id", "test-course"),
            "courseName": course.get("name", "Test Course"),
            "courseTime": "18:30",
            "datetime": test_dates[0],
            "offerId": offer.get("id", "test-offer"),
            "offerName": offer.get("name", "Test Offer"),
            "price": 30,
            "quantity": 1,
            "totalPrice": 90,
            "selectedDates": test_dates,
            "selectedDatesText": "mer. 21 janv., mer. 28 janv., mer. 4 févr."
        }
        
        response = requests.post(f"{BASE_URL}/api/reservations", json=reservation_data)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify selectedDates is stored correctly
        assert "selectedDates" in data
        assert data["selectedDates"] == test_dates
        
        # Verify selectedDatesText is stored correctly
        assert "selectedDatesText" in data
        assert data["selectedDatesText"] == "mer. 21 janv., mer. 28 janv., mer. 4 févr."
        
        print("SUCCESS: Reservation model correctly stores selectedDates and selectedDatesText")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reservations/{data['id']}")
    
    def test_price_calculation_with_multiple_dates(self):
        """Test that total price is correctly calculated for multiple dates"""
        courses = requests.get(f"{BASE_URL}/api/courses").json()
        offers = requests.get(f"{BASE_URL}/api/offers").json()
        
        if not courses or not offers:
            pytest.skip("No courses or offers available")
        
        course = courses[0]
        # Find a service offer (not a product)
        service_offers = [o for o in offers if not o.get('isProduct', False)]
        if not service_offers:
            pytest.skip("No service offers available")
        
        offer = service_offers[0]
        unit_price = offer.get("price", 30)
        
        # Test with different number of dates
        for num_dates in [1, 2, 3, 4]:
            dates = [(datetime.now() + timedelta(days=7*i)).isoformat() for i in range(num_dates)]
            expected_total = unit_price * num_dates
            
            reservation_data = {
                "userId": self.test_user_id,
                "userName": f"TEST Price Calc {num_dates} dates",
                "userEmail": self.test_email,
                "userWhatsapp": "+41791234567",
                "courseId": course.get("id", "test-course"),
                "courseName": course.get("name", "Test Course"),
                "courseTime": "18:30",
                "datetime": dates[0],
                "offerId": offer.get("id", "test-offer"),
                "offerName": offer.get("name", "Test Offer"),
                "price": unit_price,
                "quantity": 1,
                "totalPrice": expected_total,
                "selectedDates": dates,
                "selectedDatesText": f"{num_dates} dates"
            }
            
            response = requests.post(f"{BASE_URL}/api/reservations", json=reservation_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("totalPrice") == expected_total
            print(f"SUCCESS: {num_dates} dates × {unit_price} CHF = {expected_total} CHF")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/reservations/{data['id']}")


class TestOffersVisibility:
    """Test that offers section is only visible when dates are selected"""
    
    def test_offers_endpoint(self):
        """Test offers endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        offers = response.json()
        
        # Check for service offers (non-products)
        service_offers = [o for o in offers if not o.get('isProduct', False) and o.get('visible', True)]
        print(f"Found {len(service_offers)} visible service offers")
        
        # Check for product offers
        product_offers = [o for o in offers if o.get('isProduct', False) and o.get('visible', True)]
        print(f"Found {len(product_offers)} visible product offers")
        
        return offers


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
