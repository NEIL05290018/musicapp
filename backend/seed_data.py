import sys
from auth import hash_password
from database import SessionLocal, User, FavoriteSong, FavoritePlaylist


def seed():
    db = SessionLocal()

    users_data = [
        {"username": "alice", "email": "test@alice.com", "password": "password123"},
        {"username": "bob", "email": "test@bob.com", "password": "password123"},
        {"username": "carol", "email": "test@carol.com", "password": "password123"},
        {"username": "admin", "email": "admin@audiosift.com", "password": "admin123"},
        {"username": "guest", "email": "guest@audiosift.com", "password": "guest123"},
    ]

    users = []
    for data in users_data:
        existing = db.query(User).filter(User.email == data["email"]).first()
        if existing:
            print(f"User already exists: {data['email']}")
            users.append(existing)
            continue
        user = User(
            username=data["username"],
            email=data["email"],
            password_hash=hash_password(data["password"]),
        )
        db.add(user)
        db.flush()
        users.append(user)
        print(f"Created user: {data['email']} (password: {data['password']})")

    db.commit()

    alice, bob, carol, admin, guest = users

    alice_fav_songs = ["s001", "s003", "s006", "s008", "s012", "s015"]
    alice_fav_playlists = ["p001", "p003", "p011"]

    bob_fav_songs = ["s004", "s007", "s011", "s013", "s025", "s030"]
    bob_fav_playlists = ["p002", "p006"]

    carol_fav_songs = ["s002", "s005", "s009", "s014", "s019", "s022", "s028"]
    carol_fav_playlists = ["p004", "p007", "p008"]

    admin_fav_songs = ["s001", "s002", "s003", "s004", "s005", "s006", "s007", "s008", "s009", "s010"]
    admin_fav_playlists = ["p001", "p002", "p003", "p004", "p005", "p006"]

    guest_fav_songs = ["s021", "s027"]
    guest_fav_playlists = ["p010", "p012"]

    favorites_data = [
        (alice, alice_fav_songs, alice_fav_playlists),
        (bob, bob_fav_songs, bob_fav_playlists),
        (carol, carol_fav_songs, carol_fav_playlists),
        (admin, admin_fav_songs, admin_fav_playlists),
        (guest, guest_fav_songs, guest_fav_playlists),
    ]

    for user, songs, playlists in favorites_data:
        for sid in songs:
            existing = db.query(FavoriteSong).filter(
                FavoriteSong.user_id == user.id, FavoriteSong.song_id == sid
            ).first()
            if not existing:
                db.add(FavoriteSong(user_id=user.id, song_id=sid))

        for pid in playlists:
            existing = db.query(FavoritePlaylist).filter(
                FavoritePlaylist.user_id == user.id, FavoritePlaylist.playlist_id == pid
            ).first()
            if not existing:
                db.add(FavoritePlaylist(user_id=user.id, playlist_id=pid))

    db.commit()
    print("\nSeed data inserted successfully!")
    print("=" * 50)
    print("Test accounts (all in audiosift database):")
    print("  test@alice.com  / password123")
    print("  test@bob.com    / password123")
    print("  test@carol.com  / password123")
    print("  admin@audiosift.com / admin123")
    print("  guest@audiosift.com / guest123")
    print("=" * 50)

    db.close()


if __name__ == "__main__":
    seed()
