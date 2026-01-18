from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(title="Bet Tracker API")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = MongoClient("mongodb://localhost:27017/")
db = client['bet_tracker']
bets_collection = db['bets']
users_collection = db['users']

# Pydantic models for request validation
class UserCreate(BaseModel):
    username: str
    initial_balance: float = 0

class Participant(BaseModel):
    username: str
    amount: float
    position: str

class BetCreate(BaseModel):
    description: str
    participants: List[Participant]

class BetResolve(BaseModel):
    winner_position: str

class ParticipantAdd(BaseModel):
    username: str
    amount: float
    position: str

# Helper function to serialize MongoDB documents
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# User Endpoints
@app.post("/users")
def create_user(user: UserCreate):
    """Create a new user"""
    existing = users_collection.find_one({'username': user.username})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = {
        'username': user.username,
        'balance': user.initial_balance,
        'created_at': datetime.now()
    }
    result = users_collection.insert_one(new_user)
    return {"message": f"User {user.username} created", "id": str(result.inserted_id)}

@app.get("/users")
def get_all_users():
    """Get all users"""
    users = list(users_collection.find())
    return [serialize_doc(u) for u in users]

@app.get("/users/{username}")
def get_user(username: str):
    """Get a specific user's info"""
    user = users_collection.find_one({'username': username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@app.get("/users/{username}/balance")
def get_user_balance(username: str):
    """Get user's current balance"""
    user = users_collection.find_one({'username': username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"username": username, "balance": user['balance']}

# Bet Endpoints
@app.post("/bets")
def create_bet(bet: BetCreate):
    """Create a new bet"""
    # Verify all participants exist and have sufficient balance
    for p in bet.participants:
        user = users_collection.find_one({'username': p.username})
        if not user:
            raise HTTPException(status_code=404, detail=f"User {p.username} not found")
        if user['balance'] < p.amount:
            raise HTTPException(status_code=400, detail=f"User {p.username} has insufficient balance")
    
    new_bet = {
        'description': bet.description,
        'participants': [p.dict() for p in bet.participants],
        'total_pool': sum(p.amount for p in bet.participants),
        'resolved': False,
        'winner': None,
        'created_at': datetime.now(),
        'resolved_at': None
    }
    
    # Deduct amounts from user balances
    for p in bet.participants:
        users_collection.update_one(
            {'username': p.username},
            {'$inc': {'balance': -p.amount}}
        )
    
    result = bets_collection.insert_one(new_bet)
    return {"message": "Bet created", "id": str(result.inserted_id)}

@app.get("/bets")
def get_all_bets():
    """Get all bets"""
    bets = list(bets_collection.find())
    return [serialize_doc(b) for b in bets]

@app.get("/bets/active")
def get_active_bets():
    """Get all unresolved bets"""
    bets = list(bets_collection.find({'resolved': False}))
    return [serialize_doc(b) for b in bets]

@app.get("/bets/{bet_id}")
def get_bet(bet_id: str):
    """Get a specific bet"""
    try:
        bet = bets_collection.find_one({'_id': ObjectId(bet_id)})
        if not bet:
            raise HTTPException(status_code=404, detail="Bet not found")
        return serialize_doc(bet)
    except:
        raise HTTPException(status_code=400, detail="Invalid bet ID")

@app.post("/bets/{bet_id}/resolve")
def resolve_bet(bet_id: str, resolution: BetResolve):
    """Resolve a bet and distribute winnings"""
    try:
        bet = bets_collection.find_one({'_id': ObjectId(bet_id)})
        if not bet:
            raise HTTPException(status_code=404, detail="Bet not found")
        
        if bet['resolved']:
            raise HTTPException(status_code=400, detail="Bet already resolved")
        
        # Find winners
        winners = [p for p in bet['participants'] if p['position'] == resolution.winner_position]
        
        if not winners:
            raise HTTPException(status_code=400, detail=f"No participants found with position: {resolution.winner_position}")
        
        # Calculate and distribute winnings
        total_winner_stake = sum(w['amount'] for w in winners)
        
        for winner in winners:
            winner_share = (winner['amount'] / total_winner_stake) * bet['total_pool']
            users_collection.update_one(
                {'username': winner['username']},
                {'$inc': {'balance': winner_share}}
            )
        
        # Mark bet as resolved
        bets_collection.update_one(
            {'_id': ObjectId(bet_id)},
            {
                '$set': {
                    'resolved': True,
                    'winner': resolution.winner_position,
                    'resolved_at': datetime.now()
                }
            }
        )
        
        return {"message": "Bet resolved", "winners": [w['username'] for w in winners]}
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=400, detail="Invalid bet ID")

@app.post("/bets/{bet_id}/participants")
def add_participant(bet_id: str, participant: ParticipantAdd):
    """Add a participant to an existing bet"""
    try:
        bet = bets_collection.find_one({'_id': ObjectId(bet_id)})
        if not bet:
            raise HTTPException(status_code=404, detail="Bet not found")
        
        if bet['resolved']:
            raise HTTPException(status_code=400, detail="Cannot add participants to resolved bet")
        
        # Check user exists and has balance
        user = users_collection.find_one({'username': participant.username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user['balance'] < participant.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Deduct from user balance
        users_collection.update_one(
            {'username': participant.username},
            {'$inc': {'balance': -participant.amount}}
        )
        
        # Add participant to bet
        bets_collection.update_one(
            {'_id': ObjectId(bet_id)},
            {
                '$push': {'participants': participant.dict()},
                '$inc': {'total_pool': participant.amount}
            }
        )
        
        return {"message": f"Added {participant.username} to bet"}
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=400, detail="Invalid bet ID")

# Leaderboard Endpoint
@app.get("/leaderboard")
def get_leaderboard():
    """Get leaderboard sorted by balance"""
    users = list(users_collection.find().sort('balance', -1))
    leaderboard = [{
        'rank': i+1,
        'username': u['username'],
        'balance': u['balance']
    } for i, u in enumerate(users)]
    return leaderboard

# Health check endpoint
@app.get("/")
def root():
    return {"message": "Bet Tracker API is running"}

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)