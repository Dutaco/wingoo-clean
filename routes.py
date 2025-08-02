from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify, flash, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import current_user, login_required, login_user, logout_user
from services.matching import match_users
from models import db, User, Zone, WaiterCall, Gift, Flight, FlightBooking, Subscription
from zones import haversine
from datetime import datetime, timedelta
import json, os
from werkzeug.utils import secure_filename
from gtts import gTTS
from pathlib import Path
from openai import OpenAI
import openai
from dotenv import load_dotenv
import stripe


stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

UPLOAD_FOLDER = os.path.join("static", "audio")
ALLOWED_EXTENSIONS = {'mp3'}

bp = Blueprint('routes', __name__)

@bp.route('/')
def home():
    return render_template('index.html')

@bp.route('/_manifest.json')
def manifest():
    return send_from_directory('static', '_manifest.json', mimetype='application/manifest+json')

@bp.route('/_service-worker.js')
def service_worker():
    return send_from_directory('static', '_service-worker.js', mimetype='application/javascript')


def reset_limits_if_needed(user):
    if user.last_reset.date().month != datetime.utcnow().date().month:
        user.gift_count = 0
        user.flight_count = 0
        user.news_count = 0
        user.last_reset = datetime.utcnow()
        db.session.commit()

def user_is_limited(user, action_type):
    if user.is_premium:
        return False

    limits = {
        'gifts': 5,
        'flights': 1,
        'news': 3
    }

    if action_type == 'gifts':
        return user.gift_count >= limits['gifts']
    elif action_type == 'flights':
        return user.flight_count >= limits['flights']
    elif action_type == 'news':
        return user.news_count >= limits['news']

    return True 

@bp.route('/register', methods=['POST'])
def register():
    name = request.form.get("name")
    email = request.form.get("email")
    password = request.form.get("password")

    if not name or not email or not password:
        flash("All fields are required.", "danger")
        return render_template("index.html", active_tab="register")

    existing = User.query.filter_by(email=email).first()
    if existing:
        flash("User already exists.", "danger")
        return render_template("index.html", active_tab="register")

    uid = email.split("@")[0] + "_uid"
    hashed_pw = generate_password_hash(password)
    new_user = User(uid=uid, email=email, display_name=name, password=hashed_pw)

    lat = request.form.get("lat")
    lon = request.form.get("lon")
    if lat and lon:
        new_user.latitude = float(lat)
        new_user.longitude = float(lon)

    db.session.add(new_user)
    db.session.commit()

    login_user(new_user)
    flash("Welcome! Your account was created successfully.", "success")
    return redirect(url_for('routes.edit_interests'))


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form["email"]
        password = request.form["password"]

        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            login_user(user) 
            flash("Login successful!", "success")
            return redirect(url_for('routes.dashboard')) 
        else:
            flash("Invalid credentials.", "danger")
            return redirect(url_for('routes.home'))

    return render_template("login.html")

@bp.route('/interests', methods=['GET', 'POST'])
def interests():
    user = User.query.get(session.get("user_id"))

    all_interests = [
        "Music", "Cinema", "Ecology", "Technology", "Sports", "Travel",
        "Food", "Art", "Literature", "Photography", "Gaming", "Fashion",
        "Science", "History", "Fitness", "Cooking", "Dancing", "Reading"
    ]

    if user.interests:
        try:
            interests_list = json.loads(user.interests)
            if len(interests_list) >= 3:
                return redirect(url_for('routes.dashboard'))
        except:
            pass

    if request.method == 'POST':
        selected = request.form.getlist("interests")
        user.interests = json.dumps(selected)
        db.session.commit()
        return redirect(url_for('routes.dashboard'))

    selected_interests = []
    if user.interests:
        try:
            selected_interests = json.loads(user.interests)
        except:
            selected_interests = []

    return render_template("interests.html", interests=all_interests, selected=selected_interests)

@bp.route('/dashboard')
@login_required
def dashboard():
    reset_limits_if_needed(current_user)
    interests_list = []
    if current_user.is_authenticated and current_user.interests:
        try:
            interests_list = json.loads(current_user.interests)
        except Exception:
            pass

    return render_template("dashboard.html", user=current_user, interests=interests_list)


@bp.route('/logout')
@login_required
def logout():
    logout_user() 
    flash("You have been logged out.", "info")
    return redirect(url_for('routes.home'))

@bp.route('/update_location', methods=['POST'])
def update_location():
    user = User.query.get(session.get("user_id"))

    data = request.get_json()
    lat = data.get("lat")
    lon = data.get("lon")

    user.latitude = lat
    user.longitude = lon
    db.session.commit()

    return jsonify({"message": "Location updated successfully"})

@bp.route('/shared_interests')
def shared_interests():
    return render_template("shared_interests.html")

@bp.route('/check_zone', methods=['POST'])
@login_required
def check_zone():
    try:
        data = request.get_json()
        lat = data.get("lat")
        lon = data.get("lon")

        if not lat or not lon:
            return jsonify({"zones": []})

        user_interests = set(json.loads(current_user.interests or "[]"))
        matches = []

        zones = Zone.query.all()
        for zone in zones:
            distance = haversine(lat, lon, zone.latitude, zone.longitude)
            if distance <= zone.radius_meters and zone.interest in user_interests:
                matches.append({
                    "zone_name": zone.name,
                    "interest": zone.interest
                })

        return jsonify({"zones": matches})
    except Exception as e:
        print("Error in check_zone:", str(e))
        return jsonify({"zones": [], "error": str(e)})


@bp.route('/call_waiter', methods=['POST'])
@login_required
def call_waiter():
    data = request.get_json()
    zone_name = data.get('zone_name')

    if not zone_name:
        return jsonify({'status': 'error', 'message': 'Missing zone_name'}), 400

    zone = Zone.query.filter_by(name=zone_name).first()
    if not zone:
        return jsonify({'status': 'error', 'message': 'Zone not found'}), 404

    call = WaiterCall(user_id=current_user.id, zone_id=zone.id, timestamp=datetime.utcnow())
    db.session.add(call)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Waiter called!'})

@bp.route('/favicon.ico')
def favicon():
    return redirect(url_for('static', filename='favicon.ico'))

@bp.route('/send_gift', methods=['POST'])
@login_required
def send_gift():
    recipient_id = request.form.get('recipient_id')
    gift_type = request.form.get('gift_type')
    message = request.form.get('message', '')

    if not recipient_id or not gift_type:
        flash("Recipient and gift type are required.", "danger")
        return redirect(url_for('routes.find_matches'))

    reset_limits_if_needed(current_user)

    if current_user.is_premium:
        fee_cents = 0
    else:
        if current_user.gift_count >= 5:
            fee_cents = 50  # 0.50€
            payment_simulated = True 

            if not payment_simulated:
                flash("Simulated payment failed.", "danger")
                return redirect(url_for('routes.find_matches'))
        else:
            fee_cents = 0

    gift = Gift(
        sender_id=current_user.id,
        recipient_id=recipient_id,
        gift_type=gift_type,
        message=message,
        fee_cents=fee_cents
    )
    db.session.add(gift)

    if not current_user.is_premium:
        current_user.gift_count += 1

    db.session.commit()

    flash(f"Gift sent successfully!{' (Payment simulated)' if fee_cents else ''}", "success")
    return redirect(url_for('routes.sent_gifts'))

@bp.route('/my_gifts', methods=['GET'])
def my_gifts():
    if 'user_id' not in session:
        return redirect(url_for('routes.login'))

    user_id = session['user_id']
    gifts = Gift.query.filter_by(recipient_id=user_id).order_by(Gift.created_at.desc()).all()

    return render_template("my_gifts.html", gifts=gifts)

@bp.route('/send_gift_form', methods=['GET', 'POST'])
@login_required
def send_gift_form():
    if request.method == 'POST':
        recipient_id = request.form['recipient_id']
        gift_type = request.form['gift_type']
        message = request.form.get('message', '')

        gift = Gift(
            sender_id=current_user.id,
            recipient_id=recipient_id,
            gift_type=gift_type,
            message=message
        )
        db.session.add(gift)
        db.session.commit()

        flash("Gift sent successfully!", "success")
        return redirect(url_for('routes.sent_gifts'))

    users = User.query.all()
    return render_template('send_gift_form.html', users=users)

@bp.route('/received_gifts')
@login_required
def received_gifts():
    gifts = Gift.query.filter_by(recipient_id=current_user.id).order_by(Gift.created_at.desc()).all()
    return render_template("received_gifts.html", gifts=gifts)

@bp.route('/sent_gifts')
@login_required
def sent_gifts():
    gifts = Gift.query.filter_by(sender_id=current_user.id).order_by(Gift.created_at.desc()).all()
    return render_template("sent_gifts.html", gifts=gifts)

@bp.route('/matches')
@login_required
def find_matches():
    if not current_user.latitude or not current_user.longitude:
        flash("Please update your location to find matches.", "warning")
        return redirect(url_for('routes.dashboard'))
    try:
        current_user_interests = set(json.loads(current_user.interests))
    except (TypeError, json.JSONDecodeError):
        current_user_interests = set()

    all_users = User.query.filter(User.id != current_user.id).all()
    matches = []
    
    matching_radius_km = 50 

    for other_user in all_users:
        if other_user.latitude and other_user.longitude and other_user.interests:
            distance = haversine(
                current_user.latitude, current_user.longitude,
                other_user.latitude, other_user.longitude
            ) / 1000  

            if distance <= matching_radius_km:
                try:
                    other_user_interests = set(json.loads(other_user.interests))
                    common_interests = current_user_interests.intersection(other_user_interests)

                    if common_interests:
                        match_data = {
                            "user": other_user,
                            "distance_km": round(distance, 2),
                            "common_interests": list(common_interests)
                        }
                        matches.append(match_data)
                except (TypeError, json.JSONDecodeError):
                    continue
    
    sorted_matches = sorted(matches, key=lambda x: x['distance_km'])

    return render_template("matches.html", matches=sorted_matches)


@bp.route('/api/match', methods=['GET'])
@login_required
def get_matches():
    matches = match_users(current_user.id)
    return jsonify(matches)

@bp.route('/gifts')
def gifts():
    return "<h3>Gifts page (placeholder)</h3>"

@bp.route('/profile')
@login_required
def profile():
    interests = []
    if current_user.interests:
        try:
            interests = json.loads(current_user.interests)
        except:
            pass

    return render_template("profile.html", user=current_user, interests=interests)


@bp.route('/edit_interests', methods=['GET', 'POST'])
@login_required
def edit_interests():
    all_interests = [
        "Music", "Cinema", "Ecology", "Technology", "Sports", "Travel",
        "Food", "Art", "Literature", "Photography", "Gaming", "Fashion",
        "Science", "History", "Fitness", "Cooking", "Dancing", "Reading"
    ]

    if request.method == 'POST':
        selected = request.form.getlist("interests")
        current_user.interests = json.dumps(selected)
        db.session.commit()
        flash("Your interests were updated successfully!", "success")
        return redirect(url_for("routes.dashboard"))

    selected_interests = []
    if current_user.interests:
        try:
            selected_interests = json.loads(current_user.interests)
        except:
            selected_interests = []

    return render_template(
        "interests.html",
        interests=all_interests,
        selected=selected_interests
    )

@bp.route('/send_gift_to/<int:recipient_id>', methods=['POST'])
@login_required
def send_gift_to(recipient_id):
    gift = Gift(
        sender_id=current_user.id,
        recipient_id=recipient_id,
        gift_type="default", 
        message="Enjoy your gift!"
    )
    db.session.add(gift)
    db.session.commit()

    flash("Gift sent successfully!", "success")
    return redirect(url_for('routes.find_matches'))

@bp.route('/news')
@login_required
def news():
    reset_limits_if_needed(current_user)

    if not current_user.is_premium and current_user.news_count >= 3:
        flash("Free users can only access 3 news items per month. Upgrade to Premium for unlimited access.", "warning")
        return redirect(url_for('routes.dashboard'))

    try:
        interests = json.loads(current_user.interests) if current_user.interests else []
    except:
        interests = []

    audio_dir = Path("static/audio")
    audio_dir.mkdir(parents=True, exist_ok=True)

    news_items = []

    for interest in interests[:3]:  # max 3
        prompt = f"Write a short, engaging news summary (3-4 sentences) about recent updates in {interest.lower()}."

        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            summary = response.choices[0].message.content.strip()

            filename = f"{interest.lower()}_{datetime.utcnow().timestamp():.0f}.mp3"
            filepath = audio_dir / filename
            gTTS(summary).save(filepath.as_posix())

            news_items.append({
                "title": f"{interest} Highlights",
                "summary": summary,
                "audio_url": f"/static/audio/{filename}"
            })

        except Exception as e:
            news_items.append({
                "title": f"{interest} Highlights",
                "summary": f"Error generating news: {e}",
                "audio_url": ""
            })

    current_user.news_count += 1
    db.session.commit()

    return render_template("news.html", news_items=news_items)


@bp.route('/upload_audio', methods=['GET', 'POST'])
@login_required
def upload_audio():
    if request.method == 'POST':
        interest = request.form.get('interest')
        file = request.files.get('file')

        if not interest or not file:
            flash("Interest and audio file are required.", "danger")
            return redirect(request.url)

        filename = secure_filename(f"{interest.lower()}_news.mp3")

        if file.filename.endswith('.mp3'):
            save_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(save_path)
            flash(f"Audio for {interest} uploaded!", "success")
            return redirect(url_for('routes.news'))

        flash("Only MP3 files are allowed.", "danger")
        return redirect(request.url)

    interests = json.loads(current_user.interests or "[]")
    return render_template("upload_audio.html", interests=interests)

@bp.route('/flights', methods=['GET', 'POST'])
@login_required
def flights():
    reset_limits_if_needed(current_user)

    if user_is_limited(current_user, 'flights'):
        flash("Free users can only book 1 flight per month. Upgrade to Premium for unlimited bookings.", "warning")
        return redirect(url_for('routes.dashboard'))
    matches = []

    if request.method == 'POST':
        flight_number = request.form.get("flight_number")
        departure = request.form.get("departure")
        arrival = request.form.get("arrival")
        date = request.form.get("date")
        seat_preference = request.form.get("seat_preference")

        flight = Flight.query.filter_by(
            flight_number=flight_number,
            departure=departure,
            arrival=arrival,
            date=date
        ).first()

        if not flight:
            flight = Flight(
                flight_number=flight_number,
                departure=departure,
                arrival=arrival,
                date=date
            )
            db.session.add(flight)
            db.session.commit()

        existing_booking = FlightBooking.query.filter_by(
            user_id=current_user.id,
            flight_id=flight.id
        ).first()

        if not existing_booking:
            booking = FlightBooking(
                user_id=current_user.id,
                flight_id=flight.id,
                seat_preference=seat_preference
            )
            db.session.add(booking)
            db.session.commit()

            if not current_user.is_premium:
                current_user.flight_count += 1
                db.session.commit()

        all_bookings = FlightBooking.query.filter_by(flight_id=flight.id).all()
        for booking in all_bookings:
            if booking.user_id != current_user.id:
                user = User.query.get(booking.user_id)
                try:
                    user_interests = set(json.loads(user.interests))
                    current_interests = set(json.loads(current_user.interests or "[]"))
                    shared = list(user_interests & current_interests)
                except:
                    shared = []

                matches.append({
                    "display_name": user.display_name,
                    "shared_interests": shared
                })

    return render_template("flights.html", matches=matches)

@bp.route("/api/zones")
@login_required
def api_zones():
    zones = Zone.query.all()
    zone_data = [
        {
            "name": zone.name,
            "latitude": zone.latitude,
            "longitude": zone.longitude,
            "radius": zone.radius_meters
        }
        for zone in zones
    ]
    return jsonify(zone_data)

@bp.route('/subscription')
@login_required
def subscription():
    subscription = current_user.subscription

    return render_template("subscription.html", subscription=subscription)

@bp.route('/upgrade')
@login_required
def upgrade():

    if current_user.subscription:
        current_user.subscription.start_date = datetime.utcnow()
        current_user.subscription.end_date = datetime.utcnow() + timedelta(days=30)
        current_user.subscription.is_active = True
    else:
        new_sub = Subscription(
            user_id=current_user.id,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=30),
            is_active=True
        )
        db.session.add(new_sub)

    current_user.is_premium = True
    db.session.commit()

    flash("Successfully upgraded to Premium for 30 days!", "success")
    return redirect(url_for('routes.subscription'))





