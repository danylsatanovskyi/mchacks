from __future__ import annotations
from typing import Dict, Optional
import pandas as pd

from usergroup import UserGroup  # uses tie-aware UserGroup + User inside it


class BinaryBettingSystem:
    """
    Binary event betting (Yes/No) with host cut.

    Input df requirements:
      - index: player_id
      - columns:
          * "choice"  : "yes" or "no" (case-insensitive)
          * "amount"  : numeric >= 0
          * "cut"     : per-player cut p in [0, 1] (optional if default_cut is provided)

    Settlement:
      - outcome: "yes" or "no"
      - For winners i:
            payoff_i = x_i * (1 - p_i) * M / Mwin
        where:
            x_i   = amount bet by player i
            p_i   = cut for player i (or default_cut)
            M     = total pool sum(amount)
            Mwin  = total pool of winning side sum(amount of winners)
      - For losers: payoff_i = 0
      - pnl_i = payoff_i - amount_i
    """

    def __init__(self, bets: pd.DataFrame, default_cut: float | None = None):
        self.bets = bets.copy()
        self.default_cut = default_cut
        self._validate_and_normalize()

    def _validate_and_normalize(self) -> None:
        required = {"choice", "amount"}
        missing = required - set(self.bets.columns)
        if missing:
            raise ValueError(f"Missing required columns: {sorted(missing)}")

        # Normalize choice
        self.bets["choice"] = (
            self.bets["choice"]
            .astype(str)
            .str.strip()
            .str.lower()
        )
        valid_choices = {"yes", "no"}
        bad = ~self.bets["choice"].isin(valid_choices)
        if bad.any():
            bad_ids = self.bets.index[bad].tolist()
            raise ValueError(f"Invalid choice for player(s): {bad_ids}. Use 'yes' or 'no'.")

        # Amount
        self.bets["amount"] = pd.to_numeric(self.bets["amount"], errors="raise")
        if (self.bets["amount"] < 0).any():
            bad_ids = self.bets.index[self.bets["amount"] < 0].tolist()
            raise ValueError(f"Negative bet amount for player(s): {bad_ids}")

        # Cut (per-player or default)
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
        outcome: str,
        group: Optional[UserGroup] = None,
        user_names: Optional[Dict[str, str]] = None,
    ) -> pd.DataFrame:
        outcome = str(outcome).strip().lower()
        if outcome not in {"yes", "no"}:
            raise ValueError("Outcome must be 'yes' or 'no'.")

        df = self.bets.copy()

        M = float(df["amount"].sum())
        winners_mask = df["choice"].eq(outcome)
        Mwin = float(df.loc[winners_mask, "amount"].sum())

        payoff = pd.Series(0.0, index=df.index, name="payoff")

        if M > 0 and Mwin > 0:
            payoff.loc[winners_mask] = (
                df.loc[winners_mask, "amount"]
                * (1.0 - df.loc[winners_mask, "cut"])
                * (M / Mwin)
            )

        pnl = (payoff - df["amount"]).rename("pnl")
        out = pd.DataFrame({"payoff": payoff, "pnl": pnl}, index=df.index)

        # Update users + group titles (tie-aware)
        if group is not None:
            names = user_names or {}

            for player_id, row in df.iterrows():
                amount = float(row["amount"])
                bet_pnl = float(out.loc[player_id, "pnl"])
                did_win = (row["choice"] == outcome) and (amount > 0)

                user = group.get_or_create_user(player_id, name=names.get(player_id))
                user.apply_bet_result(bet_amount=amount, bet_pnl=bet_pnl, did_win=did_win)

            group.recompute_titles()

        return out


# ---- Example usage ----
if __name__ == "__main__":
    p = 0.02

    # Use equal amounts here if you want ties to be likely
    bets = pd.DataFrame(
        {
            "choice": ["yes", "no", "yes", "no"],
            "amount": [25, 35, 15, 45],
            "cut": [p, p, p, p],
        },
        index=["p1", "p2", "p3", "p4"],
    )

    print(bets, "\n")

    group = UserGroup()

    # Create users so "before" standings show up
    group.get_or_create_user("p1", name="Alice")
    group.get_or_create_user("p2", name="Bob")
    group.get_or_create_user("p3", name="Cara")
    group.get_or_create_user("p4", name="Dan")
    group.recompute_titles()

    print("=== BEFORE SETTLEMENT ===")
    for u in group.users:
        print(u)
    print()
    print(group)

    system = BinaryBettingSystem(bets)
    result = system.settle("yes", group=group)

    print("\n=== SETTLEMENT OUTPUT ===")
    print(result)

    print("\n=== AFTER SETTLEMENT ===")
    for u in group.users:
        print(u)
    print()
    print(group)
