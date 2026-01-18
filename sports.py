import requests
import time
from datetime import datetime

class BetMonitor:
    def __init__(self, api_key, user_id, saved_item_id):
        self.api_key = api_key
        self.user_id = user_id
        self.saved_item_id = saved_item_id
        self.base_url = "https://api.gumloop.com/api/v1"
    
    def check_bet(self, bet_description):
        """Single bet check - calls your Gumloop flow and waits for result"""
        try:
            url = f"{self.base_url}/start_pipeline?user_id={self.user_id}&saved_item_id={self.saved_item_id}"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            payload = {"sport game result": bet_description}
            
            # Start the pipeline
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            run_data = response.json()
            run_id = run_data["run_id"]
            
            # Poll for completion
            poll_url = f"{self.base_url}/get_pl_run?run_id={run_id}&user_id={self.user_id}"
            while True:
                result = requests.get(poll_url, headers=headers).json()
                state = result.get("state")
                
                if state == "DONE":
                    outputs = result.get("outputs", {})
                    # Get first output value if it's a dict
                    if isinstance(outputs, dict) and outputs:
                        output_value = list(outputs.values())[0]
                    else:
                        output_value = str(outputs)
                    return {"output": output_value}
                elif state in ["FAILED", "TERMINATED"]:
                    print(f"Flow ended with state: {state}")
                    return None
                
                time.sleep(2)
                
        except Exception as e:
            print(f"ERROR: Error calling flow: {e}")
            return None
    
    def monitor_bet_continuously(self, bet_description, check_interval=300, max_checks=None):
        """Continuously monitor a bet until it's resolved."""
        print(f"Starting to monitor bet: {bet_description}")
        print(f"Checking every {check_interval} seconds\n")
        
        check_count = 0
        
        while True:
            check_count += 1
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            print(f"[Check #{check_count} at {timestamp}]")
            
            # Call your Gumloop flow
            result = self.check_bet(bet_description)
            
            if result is None:
                print("WARNING: Flow call failed, retrying...\n")
                time.sleep(check_interval)
                continue
            
            # Get the output from the flow
            output = result.get("output", "")
            print(f"Result: {output}\n")
            
            # Check if bet is resolved
            if "not yet resolved" not in output.lower() and "not resolved" not in output.lower() and output.lower() != "":
                print(f"SUCCESS: BET RESOLVED!")
                print(f"Winner: {output}")
                return output
            
            # Check if max checks reached
            if max_checks and check_count >= max_checks:
                print(f"STOPPED: Reached maximum checks ({max_checks}).")
                return None
            
            print(f"Waiting: Bet not resolved yet. Next check in {check_interval} seconds...\n")
            time.sleep(check_interval)


if __name__ == "__main__":
    # ========== USAGE ==========
    API_KEY = "011931333843413982a3fe500c4c1b84"
    USER_ID = "KmBUUScbzvdPDMRsWAfOuaxnkzF3"
    SAVED_ITEM_ID = "fGasRrQ3voLDvzXUfRVkXw"

    # Create monitor
    monitor = BetMonitor(API_KEY, USER_ID, SAVED_ITEM_ID)

    # Monitor a bet continuously
    bet = "barca madrid jan 12 2026"
    winner = monitor.monitor_bet_continuously(
        bet_description=bet,
        check_interval=3,
        max_checks=100
    )

    print(f"\nFinal result: {winner}")