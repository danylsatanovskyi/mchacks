import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
import requests
from apscheduler.schedulers.background import BackgroundScheduler
from bson.objectid import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from difflib import SequenceMatcher

# Load environment variables
load_dotenv()

# Allow betting_logic modules to import usergroup directly
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(CURRENT_DIR, "betting_logic"))

from betting_logic.binarybet import BinaryBettingSystem
from betting_logic.multplechoicebet import MultipleChoiceBetting
from betting_logic.targetproximitybet import TargetProximityBet
from betting_logic.usergroup import UserGroup, User
from sports import BetMonitor


app = FastAPI(title="Bet Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "bet_tracker")
API_SPORTS_KEY = os.getenv("API_SPORTS_KEY", "139f82b9b334587827c3b41cc94cc58d")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

users_collection = db["users"]
events_collection = db["events"]
bets_collection = db["bets"]
wagers_collection = db["wagers"]
leagues_collection = db["leagues"]


def seed_past_events():
    past_events = [
        {
            "id": "seed-2024-11-12-ars-che",
            "category": "sports",
            "league": "Premier League",
            "teams": ["Arsenal", "Chelsea"],
            "title": "Arsenal vs Chelsea",
            "start_time": datetime(2024, 11, 12, 20, 0, 0),
            "status": "finished",
            "resolution_options": ["Arsenal", "Chelsea"],
            "result": {"winner": "Arsenal", "score": "2-1"},
        },
        {
            "id": "seed-2024-12-03-bar-rmd",
            "category": "sports",
            "league": "La Liga",
            "teams": ["Barcelona", "Real Madrid"],
            "title": "Barcelona vs Real Madrid",
            "start_time": datetime(2024, 12, 3, 21, 0, 0),
            "status": "finished",
            "resolution_options": ["Barcelona", "Real Madrid"],
            "result": {"winner": "Real Madrid", "score": "1-3"},
        },
        {
            "id": "seed-2025-01-08-mia-atl",
            "category": "sports",
            "league": "MLS",
            "teams": ["Inter Miami", "Atlanta United"],
            "title": "Inter Miami vs Atlanta United",
            "start_time": datetime(2025, 1, 8, 19, 30, 0),
            "status": "finished",
            "resolution_options": ["Inter Miami", "Atlanta United"],
            "result": {"winner": "Inter Miami", "score": "3-0"},
        },
    ]
    for event in past_events:
        events_collection.update_one({"id": event["id"]}, {"$set": event}, upsert=True)


seed_past_events()


class UserCreate(BaseModel):
    user_id: str
    email: str
    username: str
    balance: float = 0.0
    profile_pic: Optional[str] = None
    group_id: Optional[str] = None
    league_id: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    profile_pic: Optional[str] = None


class EventCreate(BaseModel):
    id: str
    category: str  # "sports" | "custom"
    league: Optional[str] = None
    teams: Optional[List[str]] = None
    title: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str  # "upcoming" | "live" | "finished"
    result: Optional[Dict[str, Any]] = None
    resolution_options: Optional[List[str]] = None


class BetCreate(BaseModel):
    event_id: str
    league_id: Optional[str] = None
    type: str  # "moneyline" | "n-way-moneyline" | "target-proximity"
    title: str
    options: List[str]
    stake: float


class BetResolve(BaseModel):
    winner: Optional[str]
    mode: str = "manual"  # "manual" | "commissioner_override"
    did_hit: Optional[bool] = None
    is_finished: bool
    note: Optional[str] = None


class WagerCreate(BaseModel):
    bet_id: str
    selection: str
    stake: float


class LeagueCreate(BaseModel):
    name: str
    commissioner_id: str


class LeagueUpdate(BaseModel):
    name: str


class CommissionerTransfer(BaseModel):
    user_id: str


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


def round_money(value: float) -> float:
    return round(float(value), 2)


def fuzzy_match_team(api_result: str, team_options: List[str], threshold=0.6) -> Optional[str]:
    best_match = None
    best_ratio = 0.0
    for team in team_options:
        ratio = SequenceMatcher(None, api_result.lower(), team.lower()).ratio()
        if ratio > best_ratio and ratio > threshold:
            best_ratio = ratio
            best_match = team
    return best_match


def check_sports_events():
    sports_events = events_collection.find(
        {"category": "sports", "status": {"$ne": "finished"}}
    )

    api_key = os.getenv("GUMLOOP_API_KEY", "")
    user_id = os.getenv("GUMLOOP_USER_ID", "")
    saved_item_id = os.getenv("GUMLOOP_SAVED_ITEM_ID", "")

    if not api_key or not user_id or not saved_item_id:
        return

    monitor = BetMonitor(api_key, user_id, saved_item_id)

    for event in sports_events:
        result = monitor.check_bet(event["title"])
        if (
            result
            and result.get("output")
            and "not resolved" not in result["output"].lower()
        ):
            winner = fuzzy_match_team(result["output"], event.get("teams", []))
            if winner:
                events_collection.update_one(
                    {"_id": event["_id"]},
                    {"$set": {"status": "finished", "result": {"winner": winner}}},
                )


scheduler = BackgroundScheduler()
scheduler.add_job(check_sports_events, "interval", hours=1)
scheduler.start()


def _map_fixture_status(status_short: str) -> str:
    if status_short in ["NS", "TBD"]:
        return "upcoming"
    if status_short in ["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"]:
        return "finished"
    return "live"


def _format_score(fixture: Dict[str, Any]) -> Optional[str]:
    score = fixture.get("score", {}).get("fulltime", {})
    home_score = score.get("home")
    away_score = score.get("away")
    if home_score is None or away_score is None:
        goals = fixture.get("goals", {})
        home_score = goals.get("home")
        away_score = goals.get("away")
    if home_score is None or away_score is None:
        return None
    return f"{home_score}-{away_score}"


@app.post("/events/fetch")
def fetch_events(date: str, limit: int = 50):
    api_key = API_SPORTS_KEY or "139f82b9b334587827c3b41cc94cc58d"

    try:
        datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    url = "https://v3.football.api-sports.io/fixtures"
    headers = {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": api_key,
    }
    params = {"date": date}
    response = requests.get(url, headers=headers, params=params, timeout=15)
    response.raise_for_status()
    data = response.json().get("response", [])[:limit]

    inserted = 0
    for fixture in data:
        fixture_id = str(fixture.get("fixture", {}).get("id"))
        league_name = fixture.get("league", {}).get("name")
        home = fixture.get("teams", {}).get("home", {}).get("name")
        away = fixture.get("teams", {}).get("away", {}).get("name")
        start_time_str = fixture.get("fixture", {}).get("date")
        status_short = fixture.get("fixture", {}).get("status", {}).get("short", "NS")
        start_time = None
        if start_time_str:
            try:
                start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
            except ValueError:
                start_time = None

        score_text = _format_score(fixture)
        winner = None
        if score_text and status_short in ["FT", "AET", "PEN"]:
            try:
                home_score, away_score = [int(x) for x in score_text.split("-")]
                if home_score > away_score:
                    winner = home
                elif away_score > home_score:
                    winner = away
            except ValueError:
                winner = None
        doc = {
            "id": fixture_id,
            "category": "sports",
            "league": league_name,
            "teams": [home, away],
            "title": f"{home} vs {away}",
            "start_time": start_time,
            "status": _map_fixture_status(status_short),
            "resolution_options": [home, away],
        }
        if score_text or winner:
            doc["result"] = {"score": score_text}
            if winner:
                doc["result"]["winner"] = winner

        result = events_collection.update_one({"id": fixture_id}, {"$set": doc}, upsert=True)
        if result.upserted_id or result.modified_count > 0:
            inserted += 1

    return {"inserted": inserted, "count": len(data)}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/users/me")
def get_current_user(x_user_id: Optional[str] = Header(default=None)):
    user_id = x_user_id or "fake-user-id-123"
    
    # User data mapping for fake users
    user_data_map = {
        "fake-user-id-123": {
            "email": "devuser@mchacks.ca",
            "username": "Dev User",
            "profile_pic": "https://i.pravatar.cc/150?img=12",
        },
        "fake-user-id-456": {
            "email": "testuser@mchacks.ca",
            "username": "Test User",
            "profile_pic": "https://i.pravatar.cc/150?img=1",
        },
    }
    
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        # Create new user with default data
        default_data = user_data_map.get(user_id, {
            "email": f"user_{user_id}@mchacks.com",
            "username": f"User {user_id[-3:]}",
            "profile_pic": "https://i.pravatar.cc/150",
        })
        new_user = {
            "user_id": user_id,
            "email": default_data["email"],
            "username": default_data["username"],
            "balance": 100.0,
            "profile_pic": default_data["profile_pic"],
            "group_id": None,
            "league_id": None,
            "total_bets": 0,
            "total_wins": 0,
            "total_losses": 0,
            "current_pnl": 0.0,
            "greatest_win": 0.0,
            "greatest_loss": 0.0,
            "win_streak": 0,
            "created_at": datetime.now(),
        }
        users_collection.insert_one(new_user)
        user = new_user
    else:
        # Ensure existing users have a balance field
        if "balance" not in user:
            users_collection.update_one(
                {"user_id": user_id},
                {"$set": {"balance": 100.0}},
            )
            user = users_collection.find_one({"user_id": user_id})
    
    return serialize_doc(user)


@app.get("/users/{user_id}")
def get_user(user_id: str):
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)


@app.patch("/users/me")
def update_current_user(
    updates: UserUpdate, x_user_id: Optional[str] = Header(default=None)
):
    user_id = x_user_id or "fake-user-id-123"
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    users_collection.update_one({"user_id": user_id}, {"$set": update_data})
    user = users_collection.find_one({"user_id": user_id})
    return serialize_doc(user)


@app.post("/events")
def create_event(event: EventCreate):
    events_collection.insert_one(event.dict())
    return {"message": "Event created"}


@app.get("/events")
def get_events(
    league: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
):
    query: Dict[str, Any] = {}
    if league:
        query["league"] = league
    if status:
        query["status"] = status
    if date:
        try:
            day_start = datetime.fromisoformat(date)
            day_end = day_start.replace(hour=23, minute=59, second=59, microsecond=999999)
            query["start_time"] = {"$gte": day_start, "$lte": day_end}
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    events = list(events_collection.find(query))
    return [serialize_doc(e) for e in events]


@app.post("/events/refresh")
def refresh_events():
    check_sports_events()
    return {"message": "Sports events refreshed"}


@app.post("/bets")
def create_bet(bet: BetCreate):
    new_bet = {
        "creator_id": "fake-user-id-123",
        "event_id": bet.event_id,
        "league_id": bet.league_id,
        "type": bet.type,
        "title": bet.title,
        "options": bet.options,
        "stake": bet.stake,
        "status": "open",
        "created_at": datetime.now(),
        "resolved_at": None,
        "winner": None,
        "resolution_mode": None,
        "resolved_by": None,
        "judge_note": None,
        "is_finished": False,
        "did_hit": None,
    }
    result = bets_collection.insert_one(new_bet)
    new_bet["_id"] = result.inserted_id
    return serialize_doc(new_bet)


@app.get("/bets")
def get_bets(group_id: Optional[str] = None, status: Optional[str] = None):
    query: Dict[str, Any] = {}
    if group_id:
        query["league_id"] = group_id
    if status:
        query["status"] = status
    bets = list(bets_collection.find(query))
    return [serialize_doc(b) for b in bets]


@app.get("/bets/{bet_id}/wagers")
def get_bet_wagers(bet_id: str):
    wagers = list(wagers_collection.find({"bet_id": bet_id}))
    return [serialize_doc(w) for w in wagers]


@app.get("/wagers")
def get_wagers(bet_id: Optional[str] = None, group_id: Optional[str] = None):
    query: Dict[str, Any] = {}
    if bet_id:
        query["bet_id"] = bet_id
    if group_id:
        # Get all bets for this league, then get wagers for those bets
        bets = list(bets_collection.find({"league_id": group_id}))
        bet_ids = [str(b["_id"]) for b in bets]
        if bet_ids:
            query["bet_id"] = {"$in": bet_ids}
        else:
            # No bets for this league, return empty list
            return []
    # If no filters, return empty list (we don't want to return all wagers)
    if not query:
        return []
    wagers = list(wagers_collection.find(query).sort("created_at", -1))
    return [serialize_doc(w) for w in wagers]


@app.post("/wagers")
def create_wager(wager: WagerCreate, x_user_id: Optional[str] = Header(default=None)):
    user_id = x_user_id or "fake-user-id-123"
    try:
        bet = bets_collection.find_one({"_id": ObjectId(wager.bet_id)})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid bet_id format: {str(e)}")
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")
    if bet["status"] != "open":
        raise HTTPException(status_code=400, detail="Bet is not open")
    
    # Ensure wager stake matches bet stake
    if wager.stake != bet["stake"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Wager stake must match bet stake of {bet['stake']}"
        )

    user = users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["balance"] < wager.stake:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Check if user already has a wager on this bet
    existing_wager = wagers_collection.find_one({
        "bet_id": wager.bet_id,
        "user_id": user_id
    })
    if existing_wager:
        raise HTTPException(status_code=400, detail="You have already placed a wager on this bet")

    # Deduct balance and update stats
    users_collection.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "balance": round_money(-wager.stake),
                "total_bets": 1
            }
        }
    )

    new_wager = {
        "bet_id": wager.bet_id,
        "user_id": user_id,
        "selection": wager.selection,
        "stake": round_money(wager.stake),
        "payout": None,
        "status": "pending",
        "created_at": datetime.now(),
    }
    result = wagers_collection.insert_one(new_wager)
    new_wager["_id"] = result.inserted_id
    # Auto-resolve when at least 2 wagers exist and event is finished
    event = events_collection.find_one({"id": bet["event_id"]})
    if event and event.get("status") == "finished":
        result = event.get("result") or {}
        winner = result.get("winner")
        # If winner is missing but score exists, derive from score and team order
        if not winner and result.get("score") and event.get("teams"):
            try:
                home_score, away_score = [int(x) for x in result["score"].split("-")]
                if home_score > away_score:
                    winner = event["teams"][0]
                elif away_score > home_score:
                    winner = event["teams"][1]
            except ValueError:
                winner = None
        if winner:
            wager_count = wagers_collection.count_documents({"bet_id": wager.bet_id})
            if wager_count >= 2:
                current_bet = bets_collection.find_one({"_id": bet["_id"]})
                if current_bet and current_bet.get("status") == "open":
                    resolve_bet(
                        bet_id=str(bet["_id"]),
                        resolution=BetResolve(
                            winner=winner,
                            mode="manual",
                            did_hit=True,
                            is_finished=True,
                        ),
                    )
    return serialize_doc(new_wager)


@app.post("/bets/{bet_id}/resolve")
def resolve_bet(bet_id: str, resolution: BetResolve):
    bet = bets_collection.find_one({"_id": ObjectId(bet_id)})
    if not bet or bet.get("status") == "resolved":
        raise HTTPException(status_code=400, detail="Bet not found or already resolved")

    wagers = list(wagers_collection.find({"bet_id": bet_id}))
    if not wagers:
        raise HTTPException(status_code=400, detail="No wagers found for this bet")

    df_data = []
    user_ids = []

    for w in wagers:
        if bet["type"] == "target-proximity":
            df_data.append({"guess": float(w["selection"]), "amount": w["stake"], "cut": 0.02})
        elif bet["type"] == "moneyline":
            choice = "yes" if w["selection"] == resolution.winner else "no"
            df_data.append({"choice": choice, "amount": w["stake"], "cut": 0.02})
        else:
            df_data.append({"choice": w["selection"], "amount": w["stake"], "cut": 0.02})
        user_ids.append(w["user_id"])

    df = pd.DataFrame(df_data, index=user_ids)

    group = UserGroup()
    user_names = {}

    for user_id in user_ids:
        user_doc = users_collection.find_one({"user_id": user_id})
        if user_doc:
            user = User(
                user_id=user_id,
                name=user_doc["username"],
                total_wins=user_doc.get("total_wins", 0),
                total_losses=user_doc.get("total_losses", 0),
                pnl=user_doc.get("current_pnl", 0.0),
                greatest_win=user_doc.get("greatest_win", 0.0),
                greatest_loss=user_doc.get("greatest_loss", 0.0),
                win_streak=user_doc.get("win_streak", 0),
                number_of_bets=user_doc.get("total_bets", 0),
            )
            group.users.append(user)
            user_names[user_id] = user_doc["username"]

    if bet["type"] == "moneyline":
        system = BinaryBettingSystem(df)
        results = system.settle("yes", group=group, user_names=user_names)
    elif bet["type"] == "n-way-moneyline":
        system = MultipleChoiceBetting(df)
        results = system.settle(resolution.winner, group=group, user_names=user_names)
    elif bet["type"] == "target-proximity":
        system = TargetProximityBet(df, s=3.0)
        results = system.settle(float(resolution.winner), group=group, user_names=user_names)
    else:
        raise HTTPException(status_code=400, detail="Unknown bet type")

    stake_by_user = {w["user_id"]: float(w["stake"]) for w in wagers}

    for user_id, row in results.iterrows():
        stake_amount = stake_by_user.get(user_id, 0.0)
        payout = round_money(stake_amount + float(row["pnl"]))
        status = "won" if row["pnl"] > 0 else "lost"
        wagers_collection.update_one(
            {"bet_id": bet_id, "user_id": user_id},
            {
                "$set": {
                    "payout": payout,
                    "status": status,
                }
            },
        )
        
        # Update user balance with payout
        user_doc = users_collection.find_one({"user_id": user_id})
        if user_doc:
            users_collection.update_one(
                {"user_id": user_id},
                {"$inc": {"balance": payout}}
            )

    # Update user stats (balance is updated separately when updating wagers)
    for user in group.users:
        users_collection.update_one(
            {"user_id": user.user_id},
            {
                "$set": {
                    "total_wins": user.total_wins,
                    "total_losses": user.total_losses,
                    "current_pnl": round_money(user.pnl),
                    "greatest_win": round_money(user.greatest_win),
                    "greatest_loss": round_money(user.greatest_loss),
                    "win_streak": user.win_streak,
                    "total_bets": user.number_of_bets,
                }
            },
        )

    bets_collection.update_one(
        {"_id": ObjectId(bet_id)},
        {
            "$set": {
                "status": "resolved",
                "resolved_at": datetime.now(),
                "winner": resolution.winner,
                "resolution_mode": resolution.mode,
                "judge_note": resolution.note,
                "is_finished": resolution.is_finished,
                "did_hit": resolution.did_hit,
            }
        },
    )

    return {"message": "Bet resolved successfully", "results": results.to_dict()}


@app.get("/leaderboard")
def get_leaderboard(group_id: Optional[str] = None):
    query: Dict[str, Any] = {}
    if group_id:
        query["league_id"] = group_id
    users = list(users_collection.find(query).sort("current_pnl", -1))
    leaderboard = []
    for i, u in enumerate(users):
        leaderboard.append(
            {
                "rank": i + 1,
                "user_id": u["user_id"],
                "username": u["username"],
                "profile_pic": u.get("profile_pic"),
                "total_winnings": u.get("total_wins", 0),
                "total_wagered": u.get("total_bets", 0),
                "current_pnl": u.get("current_pnl", 0.0),
                "win_streak": u.get("win_streak", 0),
                "total_bets": u.get("total_bets", 0),
                "total_wins": u.get("total_wins", 0),
                "total_losses": u.get("total_losses", 0),
                "greatest_loss": u.get("greatest_loss", 0.0),
                "greatest_win": u.get("greatest_win", 0.0),
            }
        )
    return leaderboard


@app.post("/leagues")
def create_league(league: LeagueCreate):
    invite_code = f"LEAGUE-{ObjectId()}"[:10]
    new_league = {
        "name": league.name,
        "commissioner_id": league.commissioner_id,
        "created_at": datetime.now(),
        "member_ids": [league.commissioner_id],
        "invite_code": invite_code,
    }
    result = leagues_collection.insert_one(new_league)
    new_league["_id"] = result.inserted_id
    return serialize_doc(new_league)


@app.patch("/leagues/{league_id}")
def update_league(league_id: str, update: LeagueUpdate):
    leagues_collection.update_one(
        {"_id": ObjectId(league_id)}, {"$set": {"name": update.name}}
    )
    league = leagues_collection.find_one({"_id": ObjectId(league_id)})
    return serialize_doc(league)


@app.post("/leagues/{league_id}/transfer-commissioner")
def transfer_commissioner(league_id: str, payload: CommissionerTransfer):
    leagues_collection.update_one(
        {"_id": ObjectId(league_id)},
        {"$set": {"commissioner_id": payload.user_id}},
    )
    league = leagues_collection.find_one({"_id": ObjectId(league_id)})
    return serialize_doc(league)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
