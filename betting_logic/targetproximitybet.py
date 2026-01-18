from __future__ import annotations
from typing import Dict, Optional
import pandas as pd
import numpy as np

from usergroup import UserGroup  # expects User + UserGroup + apply_bet_result in usergroup.py


class TargetProximityBet:
    """
    Proximity-based betting using proximity-weighted effective shares of the pool.

    Same payout structure:
      - error e_i = |g_i - T|
      - proximity q_i = exp(-e_i / s)
      - effective_weight_i = amount_i * q_i
      - M = sum(amount_i)
      - W = sum(effective_weight_i)
      - payoff_i = (1 - cut_i) * effective_weight_i * (M / W)   if M>0 and W>0 else 0
      - pnl_i = payoff_i - amount_i

    NEW:
      - settle(target, group=..., user_names=...) updates each user's stats using
        user.apply_bet_result(...) and recomputes tie-aware group titles.
    """

    def __init__(
        self,
        bets: pd.DataFrame,
        s: float = 3.0,
        default_buy_in: float | None = None,
        default_cut: float | None = None,
    ):
        self.bets = bets.copy()
        self.s = float(s)
        self.default_buy_in = default_buy_in
        self.default_cut = default_cut
        self._validate_and_normalize()

    def _validate_and_normalize(self) -> None:
        if self.s <= 0:
            raise ValueError("s must be > 0.")

        required = {"guess"}
        missing = required - set(self.bets.columns)
        if missing:
            raise ValueError(f"Missing required columns: {sorted(missing)}")

        # Guess
        self.bets["guess"] = pd.to_numeric(self.bets["guess"], errors="raise")

        # Amount (buy-in)
        if "amount" not in self.bets.columns:
            if self.default_buy_in is None:
                raise ValueError("No 'amount' column provided and default_buy_in is None.")
            self.bets["amount"] = float(self.default_buy_in)
        else:
            self.bets["amount"] = pd.to_numeric(self.bets["amount"], errors="raise")
            if self.default_buy_in is not None:
                self.bets["amount"] = self.bets["amount"].fillna(float(self.default_buy_in))

        if (self.bets["amount"] < 0).any():
            bad_ids = self.bets.index[self.bets["amount"] < 0].tolist()
            raise ValueError(f"Negative amount for player(s): {bad_ids}")

        # Cut
        if "cut" not in self.bets.columns:
            if self.default_cut is None:
                raise ValueError("No 'cut' column provided and default_cut is None.")
            self.bets["cut"] = float(self.default_cut)
        else:
            self.bets["cut"] = pd.to_numeric(self.bets["cut"], errors="raise")
            if self.default_cut is not None:
                self.bets["cut"] = self.bets["cut"].fillna(float(self.default_cut))

        if self.bets["cut"].isna().any():
            bad_ids = self.bets.index[self.bets["cut"].isna()].tolist()
            raise ValueError(f"Missing cut for player(s): {bad_ids} (provide 'cut' or default_cut).")

        if ((self.bets["cut"] < 0) | (self.bets["cut"] > 1)).any():
            bad_ids = self.bets.index[((self.bets["cut"] < 0) | (self.bets["cut"] > 1))].tolist()
            raise ValueError(f"Cut out of [0,1] for player(s): {bad_ids}")

    def settle(
        self,
        target: float,
        group: Optional[UserGroup] = None,
        user_names: Optional[Dict[str, str]] = None,
    ) -> pd.DataFrame:
        T = float(target)
        df = self.bets.copy()

        # Compute proximity terms
        error = (df["guess"] - T).abs()
        proximity = np.exp(-error / self.s)

        amount = df["amount"].astype(float)
        cut = df["cut"].astype(float)

        M = float(amount.sum())
        effective_weight = amount * proximity
        W = float(effective_weight.sum())

        payoff = pd.Series(0.0, index=df.index, name="payoff")

        if M > 0 and W > 0:
            payoff = ((1.0 - cut) * effective_weight * (M / W)).rename("payoff")

        pnl = (payoff - amount).rename("pnl")

        out = pd.DataFrame(
            {
                "payoff": payoff,
                "pnl": pnl,
                "error": error,
                "proximity": proximity,
                "effective_weight": effective_weight,
            },
            index=df.index,
        )

        # ----- NEW: increment users + group -----
        if group is not None:
            names = user_names or {}

            for player_id in df.index:
                bet_amount = float(amount.loc[player_id])
                bet_pnl = float(out.loc[player_id, "pnl"])

                # Define "win" for proximity bets:
                # Everyone is "in the winning pool" to some degree, but for your stats we need a binary.
                # We treat "win" as non-negative pnl (profit or break-even).
                did_win = (bet_pnl >= 0.0) and (bet_amount > 0)

                user = group.get_or_create_user(player_id, name=names.get(player_id))
                user.apply_bet_result(bet_amount=bet_amount, bet_pnl=bet_pnl, did_win=did_win)

            group.recompute_titles()

        return out


# ---- Example usage ----
if __name__ == "__main__":
    p = 0.02
    buyin = 20

    bets = pd.DataFrame(
        {
            "guess": [11, 14, 20, 7],
            "amount": [buyin, buyin, buyin, buyin],
            "cut": [p, p, p, p],
        },
        index=["p1", "p2", "p3", "p4"],
    )

    print(bets, '\n')

    group = UserGroup()
    group.get_or_create_user("p1", name="Alice")
    group.get_or_create_user("p2", name="Bob")
    group.get_or_create_user("p3", name="Cara")
    group.get_or_create_user("p4", name="Dan")
    group.recompute_titles()

    print("=== BEFORE ===")
    print(group)

    system = TargetProximityBet(bets, s=3.0)
    result = system.settle(target=12, group=group)

    print("\n=== SETTLEMENT OUTPUT (payoff, pnl) ===")
    print(result[["payoff", "pnl"]])

    print("\n=== AFTER ===")
    for u in group.users:
        print(u)
    print()
    print(group)
