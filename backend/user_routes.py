from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db, User, FavoriteSong, FavoritePlaylist
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/user", tags=["user"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class FavoriteRequest(BaseModel):
    song_id: str | None = None
    playlist_id: str | None = None


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.username) < 2 or len(req.username) > 50:
        raise HTTPException(status_code=400, detail="用户名长度需在2-50字符之间")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="密码长度至少6位")

    existing = db.query(User).filter(
        (User.email == req.email) | (User.username == req.username)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名或邮箱已被注册")

    user = User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id})
    return {"token": token, "user": user.to_dict()}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    token = create_access_token({"user_id": user.id})
    return {"token": token, "user": user.to_dict()}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"user": user.to_dict()}


@router.post("/favorite/song")
def favorite_song(
    req: FavoriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not req.song_id:
        raise HTTPException(status_code=400, detail="缺少 song_id")

    existing = db.query(FavoriteSong).filter(
        FavoriteSong.user_id == user.id,
        FavoriteSong.song_id == req.song_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"favorited": False, "song_id": req.song_id}

    fav = FavoriteSong(user_id=user.id, song_id=req.song_id)
    db.add(fav)
    db.commit()
    return {"favorited": True, "song_id": req.song_id}


@router.post("/favorite/playlist")
def favorite_playlist(
    req: FavoriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not req.playlist_id:
        raise HTTPException(status_code=400, detail="缺少 playlist_id")

    existing = db.query(FavoritePlaylist).filter(
        FavoritePlaylist.user_id == user.id,
        FavoritePlaylist.playlist_id == req.playlist_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"favorited": False, "playlist_id": req.playlist_id}

    fav = FavoritePlaylist(user_id=user.id, playlist_id=req.playlist_id)
    db.add(fav)
    db.commit()
    return {"favorited": True, "playlist_id": req.playlist_id}


@router.get("/favorites/songs")
def get_favorite_songs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favs = db.query(FavoriteSong).filter(
        FavoriteSong.user_id == user.id
    ).order_by(FavoriteSong.created_at.desc()).all()
    return {"song_ids": [f.song_id for f in favs]}


@router.get("/favorites/playlists")
def get_favorite_playlists(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favs = db.query(FavoritePlaylist).filter(
        FavoritePlaylist.user_id == user.id
    ).order_by(FavoritePlaylist.created_at.desc()).all()
    return {"playlist_ids": [f.playlist_id for f in favs]}
