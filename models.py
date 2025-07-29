from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

# ------------------- USERS -------------------
class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, index=True)
    uid = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    display_name = db.Column(db.String(100))
    password = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    interests = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    profile_complete = db.Column(db.Boolean, default=False)
    is_premium = db.Column(db.Boolean, default=False)
    gift_count = db.Column(db.Integer, default=0)
    flight_count = db.Column(db.Integer, default=0)
    news_count = db.Column(db.Integer, default=0)
    last_reset = db.Column(db.DateTime, default=datetime.utcnow)

    gifts_sent = db.relationship("Gift", back_populates="sender", foreign_keys="Gift.sender_id")
    gifts_received = db.relationship("Gift", back_populates="recipient", foreign_keys="Gift.recipient_id")
    subscription = db.relationship("Subscription", back_populates="user", uselist=False)

# ------------------- GIFTS -------------------
class Gift(db.Model):
    __tablename__ = "gifts"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    gift_type = db.Column(db.String(100))
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    fee_cents = db.Column(db.Integer, default=50)
    redeemed = db.Column(db.Boolean, default=False)
    qr_code = db.Column(db.String(255), nullable=True)

    sender = db.relationship("User", foreign_keys=[sender_id], back_populates="gifts_sent")
    recipient = db.relationship("User", foreign_keys=[recipient_id], back_populates="gifts_received")

# ------------------- FLIGHTS -------------------
class Flight(db.Model):
    __tablename__ = "flights"

    id = db.Column(db.Integer, primary_key=True)
    flight_number = db.Column(db.String(50), nullable=False)
    departure = db.Column(db.String(100))
    arrival = db.Column(db.String(100))
    date = db.Column(db.String(50))

    bookings = db.relationship("FlightBooking", back_populates="flight")

# ------------------- FLIGHT BOOKINGS -------------------
class FlightBooking(db.Model):
    __tablename__ = "flight_bookings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    flight_id = db.Column(db.Integer, db.ForeignKey("flights.id"))
    seat_preference = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    flight = db.relationship("Flight", back_populates="bookings")
    matched_users = db.Column(db.Text)

# ------------------- ZONE LOCATIONS -------------------
class Zone(db.Model):
    __tablename__ = "zones"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    radius_meters = db.Column(db.Float)
    interest = db.Column(db.String(50))

# ------------------- WAITER CALL -------------------
class WaiterCall(db.Model):
    __tablename__ = "waiter_calls"

    id = db.Column(db.Integer, primary_key=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    zone_id = db.Column(db.Integer, db.ForeignKey("zones.id"))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")
    zone = db.relationship("Zone")

# ------------------- SUBSCRIPTION -------------------

class Subscription(db.Model):
    __tablename__ = "subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    user = db.relationship("User", back_populates="subscription", uselist=False)


