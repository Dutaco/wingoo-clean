import os
import logging
import qrcode
import io
import base64
import requests
from datetime import datetime
from firebase_admin import auth, firestore
from app import db
from models import User, Gift, FlightBooking

def verify_firebase_token(token):
    """Verify Firebase ID token and return user data"""
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logging.error(f"Token verification failed: {e}")
        return None

def get_user_by_uid(uid):
    """Get user data from Firestore"""
    try:
        if not db:
            return None
        doc_ref = db.collection('users').document(uid)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        logging.error(f"Error getting user: {e}")
        return None

def create_user(uid, email, display_name=None):
    """Create new user in Firestore"""
    try:
        if not db:
            return False
        user_data = {
            'uid': uid,
            'email': email,
            'display_name': display_name or email.split('@')[0],
            'interests': [],
            'created_at': datetime.now(),
            'profile_complete': False
        }
        db.collection('users').document(uid).set(user_data)
        return True
    except Exception as e:
        logging.error(f"Error creating user: {e}")
        return False

def update_user_interests(uid, interests):
    """Update user interests and mark profile as complete"""
    try:
        if not db:
            return False
        db.collection('users').document(uid).update({
            'interests': interests,
            'profile_complete': True
        })
        return True
    except Exception as e:
        logging.error(f"Error updating interests: {e}")
        return False

def generate_gift_qr(gift_id):
    """Generate QR code for a digital gift"""
    try:
        # Create QR code with gift redemption URL
        qr_data = f"https://wingoo.app/redeem/{gift_id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 string
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        logging.error(f"QR code generation error: {e}")
        return None

def send_digital_gift(sender_uid, recipient_email, gift_type, message):
    """Send a digital gift to another user"""
    try:
        if not db:
            return {'success': False, 'message': 'Database not available'}
        
        # Find recipient user
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', recipient_email).limit(1)
        docs = query.stream()
        
        recipient_uid = None
        for doc in docs:
            recipient_uid = doc.id
            break
        
        if not recipient_uid:
            return {'success': False, 'message': 'Recipient not found'}
        
        # Create gift document
        gift_data = {
            'sender_uid': sender_uid,
            'recipient_uid': recipient_uid,
            'gift_type': gift_type,
            'message': message,
            'created_at': datetime.now(),
            'redeemed': False
        }
        
        # Add gift to Firestore
        gift_ref = db.collection('gifts').add(gift_data)
        gift_id = gift_ref[1].id
        
        # Generate QR code for the gift
        qr_code = generate_gift_qr(gift_id)
        if qr_code:
            db.collection('gifts').document(gift_id).update({'qr_code': qr_code})
        
        return {'success': True, 'gift_id': gift_id}
        
    except Exception as e:
        logging.error(f"Error sending gift: {e}")
        return {'success': False, 'message': 'Failed to send gift'}

def get_user_gifts(uid):
    """Get all gifts sent and received by a user"""
    try:
        if not db:
            return {'sent': [], 'received': []}
        
        # Get sent gifts
        sent_gifts = []
        sent_query = db.collection('gifts').where('sender_uid', '==', uid)
        for doc in sent_query.stream():
            gift_data = doc.to_dict()
            gift_data['id'] = doc.id
            sent_gifts.append(gift_data)
        
        # Get received gifts
        received_gifts = []
        received_query = db.collection('gifts').where('recipient_uid', '==', uid)
        for doc in received_query.stream():
            gift_data = doc.to_dict()
            gift_data['id'] = doc.id
            received_gifts.append(gift_data)
        
        return {'sent': sent_gifts, 'received': received_gifts}
        
    except Exception as e:
        logging.error(f"Error getting gifts: {e}")
        return {'sent': [], 'received': []}

def get_personalized_news(interests):
    """Get personalized news based on user interests"""
    try:
        news_api_key = os.environ.get('NEWS_API_KEY')
        if not news_api_key:
            return []
        
        # Convert interests to news categories
        category_map = {
            'Technology': 'technology',
            'Sports': 'sports',
            'Ecology': 'science',
            'Science': 'science',
            'Music': 'entertainment',
            'Cinema': 'entertainment'
        }
        
        articles = []
        for interest in interests[:3]:  # Limit to 3 interests
            category = category_map.get(interest, 'general')
            
            url = f"https://newsapi.org/v2/top-headlines"
            params = {
                'apiKey': news_api_key,
                'category': category,
                'language': 'en',
                'pageSize': 5
            }
            
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                for article in data.get('articles', []):
                    article['interest_category'] = interest
                    articles.append(article)
        
        return articles[:10]  # Return max 10 articles
        
    except Exception as e:
        logging.error(f"Error getting news: {e}")
        return []

def find_flight_matches(user_uid, flight_number):
    """Find users with matching interests on the same flight"""
    try:
        if not db:
            return []
        
        # Get current user's interests
        user = get_user_by_uid(user_uid)
        if not user or not user.get('interests'):
            return []
        
        user_interests = set(user['interests'])
        
        # Find other users on the same flight
        flight_bookings = db.collection('flight_bookings').where('flight_number', '==', flight_number)
        matches = []
        
        for booking_doc in flight_bookings.stream():
            booking = booking_doc.to_dict()
            if booking['user_uid'] != user_uid:
                other_user = get_user_by_uid(booking['user_uid'])
                if other_user and other_user.get('interests'):
                    other_interests = set(other_user['interests'])
                    common_interests = user_interests.intersection(other_interests)
                    
                    if len(common_interests) >= 2:  # At least 2 common interests
                        matches.append({
                            'user': other_user,
                            'common_interests': list(common_interests),
                            'compatibility_score': len(common_interests)
                        })
        
        # Sort by compatibility score
        matches.sort(key=lambda x: x['compatibility_score'], reverse=True)
        return matches[:5]  # Return top 5 matches
        
    except Exception as e:
        logging.error(f"Error finding flight matches: {e}")
        return []

def book_flight_seat(user_uid, flight_number, seat_preference):
    """Book a flight seat and find potential matches"""
    try:
        if not db:
            return {'success': False, 'message': 'Database not available'}
        
        booking_data = {
            'user_uid': user_uid,
            'flight_number': flight_number,
            'seat_preference': seat_preference,
            'created_at': datetime.now(),
            'status': 'pending'
        }
        
        db.collection('flight_bookings').add(booking_data)
        return {'success': True}
        
    except Exception as e:
        logging.error(f"Error booking flight: {e}")
        return {'success': False, 'message': 'Failed to book flight'}
