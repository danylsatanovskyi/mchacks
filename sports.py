import requests
import time
from datetime import datetime, timedelta
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

'''sports_api: 139f82b9b334587827c3b41cc94cc58d
gumloop_API_KEY = "011931333843413982a3fe500c4c1b84"
gumloop_USER_ID = "KmBUUScbzvdPDMRsWAfOuaxnkzF3"
gumloop: SAVED_ITEM_ID = "fGasRrQ3voLDvzXUfRVkXw"'''


class SoccerBettingSystem:
    def __init__(self, api_sports_key, gumloop_api_key, user_id, saved_item_id):
        # API-Sports config
        self.api_sports_key = api_sports_key
        self.sports_base_url = "https://v3.football.api-sports.io"
        self.sports_headers = {
            'x-rapidapi-host': 'v3.football.api-sports.io',
            'x-rapidapi-key': api_sports_key
        }
        
        # Gumloop config
        self.gumloop_api_key = gumloop_api_key
        self.user_id = user_id
        self.saved_item_id = saved_item_id
        self.gumloop_base_url = "https://api.gumloop.com/api/v1"
        
        # Store active bets
        self.active_bets = []
    
    # ========== GAME FETCHING ==========
    
    def get_daily_games(self, date=None, limit=20):
        """Get games for a specific date (defaults to today)"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        endpoint = f"{self.sports_base_url}/fixtures"
        params = {'date': date}
        
        response = requests.get(endpoint, headers=self.sports_headers, params=params)
        all_games = response.json()['response']
        
        # Return limited number of games
        return all_games[:limit]
    
    def get_games_for_next_days(self, days=7, games_per_day=20):
        """Get games for multiple days"""
        all_games = []
        for i in range(days):
            date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
            games = self.get_daily_games(date, limit=games_per_day)
            all_games.extend(games)
        return all_games
    
    def format_game_for_display(self, game):
        """Format a game into readable format"""
        return {
            'id': game['fixture']['id'],
            'date': game['fixture']['date'],
            'league': game['league']['name'],
            'home_team': game['teams']['home']['name'],
            'away_team': game['teams']['away']['name'],
            'venue': game['fixture']['venue']['name'],
            'status': game['fixture']['status']['short']
        }
    
    def display_available_games(self, games):
        """Print available games for betting"""
        print("=" * 60)
        print("AVAILABLE GAMES FOR BETTING")
        print("=" * 60)
        
        for i, game in enumerate(games, 1):
            formatted = self.format_game_for_display(game)
            print(f"\n{i}. {formatted['home_team']} vs {formatted['away_team']}")
            print(f"   League: {formatted['league']}")
            print(f"   Date: {formatted['date']}")
            print(f"   Choose: '{formatted['home_team']}' or '{formatted['away_team']}'")
        
        return games
    
    # ========== BET MATCHING ==========
    
    def fuzzy_match_team(self, bet_team, home_team, away_team, threshold=80):
        """Match bettor's team choice to actual team using fuzzy matching"""
        home_score = fuzz.ratio(bet_team.lower(), home_team.lower())
        away_score = fuzz.ratio(bet_team.lower(), away_team.lower())
        
        if home_score >= threshold and home_score > away_score:
            return home_team
        elif away_score >= threshold and away_score > home_score:
            return away_team
        else:
            # Try partial matching
            home_partial = fuzz.partial_ratio(bet_team.lower(), home_team.lower())
            away_partial = fuzz.partial_ratio(bet_team.lower(), away_team.lower())
            
            if home_partial > away_partial and home_partial >= threshold:
                return home_team
            elif away_partial >= threshold:
                return away_team
            
            return None
    
    def create_bet(self, game, bettor1_choice, bettor2_choice):
        """Create a bet between two bettors on a game"""
        formatted_game = self.format_game_for_display(game)
        home = formatted_game['home_team']
        away = formatted_game['away_team']
        
        # Fuzzy match bettor choices to actual teams
        bettor1_team = self.fuzzy_match_team(bettor1_choice, home, away)
        bettor2_team = self.fuzzy_match_team(bettor2_choice, home, away)
        
        if not bettor1_team:
            print(f"ERROR: Could not match '{bettor1_choice}' to either team")
            return None
        
        if not bettor2_team:
            print(f"ERROR: Could not match '{bettor2_choice}' to either team")
            return None
        
        if bettor1_team == bettor2_team:
            print(f"ERROR: Both bettors chose the same team ({bettor1_team})")
            return None
        
        bet = {
            'game_id': formatted_game['id'],
            'date': formatted_game['date'],
            'league': formatted_game['league'],
            'home_team': home,
            'away_team': away,
            'bettor1': {
                'choice': bettor1_team,
                'original_input': bettor1_choice
            },
            'bettor2': {
                'choice': bettor2_team,
                'original_input': bettor2_choice
            },
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        self.active_bets.append(bet)
        
        print(f"\n✓ BET CREATED")
        print(f"  Bettor 1 chose: {bettor1_team}")
        print(f"  Bettor 2 chose: {bettor2_team}")
        print(f"  Game: {home} vs {away}")
        print(f"  Date: {formatted_game['date']}")
        
        return bet
    
    # ========== BET RESOLUTION ==========
    
    def check_bet_result(self, bet):
        """Check if bet is resolved using Gumloop flow"""
        try:
            # Create prompt for Gumloop
            bet_description = f"{bet['home_team']} {bet['away_team']} {bet['date']}"
            
            url = f"{self.gumloop_base_url}/start_pipeline?user_id={self.user_id}&saved_item_id={self.saved_item_id}"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.gumloop_api_key}"
            }
            payload = {"sport game result": bet_description}
            
            # Start the pipeline
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            run_data = response.json()
            run_id = run_data["run_id"]
            
            # Poll for completion
            poll_url = f"{self.gumloop_base_url}/get_pl_run?run_id={run_id}&user_id={self.user_id}"
            
            max_polls = 30
            poll_count = 0
            
            while poll_count < max_polls:
                result = requests.get(poll_url, headers=headers).json()
                state = result.get("state")
                
                if state == "DONE":
                    outputs = result.get("outputs", {})
                    if isinstance(outputs, dict) and outputs:
                        output_value = list(outputs.values())[0]
                    else:
                        output_value = str(outputs)
                    return {"resolved": True, "result": output_value}
                elif state in ["FAILED", "TERMINATED"]:
                    return {"resolved": False, "result": None}
                
                time.sleep(2)
                poll_count += 1
            
            return {"resolved": False, "result": None}
                
        except Exception as e:
            print(f"ERROR checking bet: {e}")
            return {"resolved": False, "result": None}
    
    def determine_winner(self, bet, game_result):
        """Determine bet winner by fuzzy matching game result to teams"""
        home = bet['home_team']
        away = bet['away_team']
        
        # Fuzzy match the result to one of the teams
        home_score = fuzz.partial_ratio(game_result.lower(), home.lower())
        away_score = fuzz.partial_ratio(game_result.lower(), away.lower())
        
        winning_team = None
        
        if home_score > away_score and home_score >= 70:
            winning_team = home
        elif away_score > home_score and away_score >= 70:
            winning_team = away
        
        # Determine which bettor won
        if winning_team == bet['bettor1']['choice']:
            return 'bettor1', winning_team
        elif winning_team == bet['bettor2']['choice']:
            return 'bettor2', winning_team
        else:
            return None, None
    
    def monitor_bet(self, bet, check_interval=300, max_checks=100):
        """Monitor a single bet until resolved"""
        print(f"\n{'='*60}")
        print(f"MONITORING BET")
        print(f"Game: {bet['home_team']} vs {bet['away_team']}")
        print(f"Bettor 1 chose: {bet['bettor1']['choice']}")
        print(f"Bettor 2 chose: {bet['bettor2']['choice']}")
        print(f"{'='*60}\n")
        
        check_count = 0
        
        while check_count < max_checks:
            check_count += 1
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            print(f"[Check #{check_count} at {timestamp}]")
            
            result = self.check_bet_result(bet)
            
            if not result['resolved']:
                print("Not resolved yet. Waiting...\n")
                time.sleep(check_interval)
                continue
            
            game_result = result['result']
            print(f"Game Result: {game_result}")
            
            # Determine winner
            winner, winning_team = self.determine_winner(bet, game_result)
            
            if winner:
                print(f"\n{'='*60}")
                print(f"BET RESOLVED!")
                print(f"Winning Team: {winning_team}")
                print(f"Winner: {winner.upper()}")
                print(f"{'='*60}\n")
                
                bet['status'] = 'resolved'
                bet['winner'] = winner
                bet['winning_team'] = winning_team
                bet['resolved_at'] = datetime.now().isoformat()
                
                return {
                    'winner': winner,
                    'winning_team': winning_team,
                    'game_result': game_result
                }
            else:
                print("Could not determine winner from result. Retrying...\n")
                time.sleep(check_interval)
        
        print("Max checks reached without resolution.")
        return None
    
    def monitor_all_bets(self, check_interval=300):
        """Monitor all active bets"""
        pending_bets = [b for b in self.active_bets if b['status'] == 'pending']
        
        print(f"\nMonitoring {len(pending_bets)} pending bets...\n")
        
        for bet in pending_bets:
            self.monitor_bet(bet, check_interval)
