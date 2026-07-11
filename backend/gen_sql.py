import bcrypt

users = [
    ("alice", "test@alice.com", "password123"),
    ("bob", "test@bob.com", "password123"),
    ("carol", "test@carol.com", "password123"),
    ("admin", "admin@audiosift.com", "admin123"),
    ("guest", "guest@audiosift.com", "guest123"),
]

print("-- ====== 复制下面 SQL 到服务器执行 ======")
print("USE audiosift;")
print()

for name, email, pw in users:
    h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    print(f"INSERT IGNORE INTO users (username, email, password_hash) VALUES ('{name}', '{email}', '{h}');")

print()
print("-- ====== 收藏数据 ======")

favs = {
    "alice": (["s001","s003","s006","s008","s012","s015"], ["p001","p003","p011"]),
    "bob": (["s004","s007","s011","s013","s025","s030"], ["p002","p006"]),
    "carol": (["s002","s005","s009","s014","s019","s022","s028"], ["p004","p007","p008"]),
    "admin": (["s001","s002","s003","s004","s005","s006","s007","s008","s009","s010"], ["p001","p002","p003","p004","p005","p006"]),
    "guest": (["s021","s027"], ["p010","p012"]),
}

for name, (songs, pls) in favs.items():
    uid = f"(SELECT id FROM users WHERE username='{name}')"
    for sid in songs:
        print(f"INSERT IGNORE INTO favorite_songs (user_id, song_id) VALUES ({uid}, '{sid}');")
    for pid in pls:
        print(f"INSERT IGNORE INTO favorite_playlists (user_id, playlist_id) VALUES ({uid}, '{pid}');")
