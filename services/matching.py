from models import User
from geopy.distance import geodesic

def match_users(user_id, max_distance_km=50):
    current_user = User.query.get(user_id)
    if not current_user or not current_user.latitude or not current_user.interests:
        return []

    user_location = (current_user.latitude, current_user.longitude)
    current_interests = set(current_user.interests.lower().split(','))

    matches = []
    all_users = User.query.filter(User.id != user_id).all()

    for user in all_users:
        if not user.latitude or not user.interests:
            continue

        distance = geodesic(user_location, (user.latitude, user.longitude)).km
        if distance > max_distance_km:
            continue

        other_interests = set(user.interests.lower().split(','))
        shared = current_interests.intersection(other_interests)

        if shared:
            matches.append({
                'id': user.id,
                'name': user.display_name,
                'shared_interests': list(shared),
                'distance_km': round(distance, 2)
            })

    return sorted(matches, key=lambda x: (-len(x['shared_interests']), x['distance_km']))

