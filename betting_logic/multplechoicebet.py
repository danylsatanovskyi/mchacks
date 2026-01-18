from __future__ import annotations
from typing import Dict, Optional, Any
import pandas as pd

from usergroup import UserGroup  # expects User + UserGroup + apply_bet_result in usergroup.py


class MultipleChoiceBetting:
    """
    Multiple-choice event betting with the SAME payout form as the binary system,
    treating "correct choice" as the winning pool and "all other choices" as the losing pool.

    Input df requirements:
      - index: player_id
      - columns:
          * "choice" : any hashable label (str/int/etc). Stored as string by default for consistency.
          * "amount" : numeric >= 0
          * "cut"    : per-player cut p in [0,1] (optional if default_cut is provided)

    Settlement:
      - outcome: the correct choice label
      - Let:
          M    = sum(amount) over ALL players (total pool)
          Mwin = sum(amount) over players with choice == outcome (winning pool)
      - For winners i:
            payoff_i = x_i * (1 - p_i) * M / Mwin
      - For losers: payoff_i = 0
      - pnl_i = payoff_i - amount_i

    Notes:
      - If Mwin == 0 (nobody picked the correct outcome), payoffs are 0 by default.
    """

    def __init__(
        self,
        bets: pd.DataFrame,
        default_cut: float | None = None,
        coerce_choice_to_str: bool = True,
    ):
        self.bets = bets.copy()
        self.default_cut = default_cut
        self.coerce_choice_to_str = coerce_choice_to_str
        self._validate_and_normalize()

    def _validate_and_normalize(self) -> None:
        required = {"choice", "amount"}
        missing = required - set(self.bets.columns)
        if missing:
            raise ValueError(f"Missing required columns: {sorted(missing)}")

        # Choice normalization (optional)
        if self.coerce_choice_to_str:
            self.bets["choice"] = self.bets["choice"].astype(str).str.strip()

        # Amount normalization
        self.bets["amount"] = pd.to_numeric(self.bets["amount"], errors="raise")
        if (self.bets["amount"] < 0).any():
            bad_ids = self.bets.index[self.bets["amount"] < 0].tolist()
            raise ValueError(f"Negative bet amount for player(s): {bad_ids}")

        # Cut handling
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
        outcome: Any,
        group: Optional[UserGroup] = None,
        user_names: Optional[Dict[str, str]] = None,
    ) -> pd.DataFrame:
        """
        Returns DataFrame with payoff + pnl.

        If `group` is provided, updates each User in the group using:
            user.apply_bet_result(bet_amount, bet_pnl, did_win)
        and recomputes group titles (ties allowed).

        user_names: optional mapping {player_id: display_name} used when auto-creating users.
        """
        # Normalize outcome to match df choice normalization
        outcome_key = str(outcome).strip() if self.coerce_choice_to_str else outcome

        df = self.bets.copy()

        M = float(df["amount"].sum())
        winners_mask = df["choice"].eq(outcome_key)
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

        # ----- NEW: increment users + group -----
        if group is not None:
            names = user_names or {}

            for player_id, row in df.iterrows():
                amount = float(row["amount"])
                bet_pnl = float(out.loc[player_id, "pnl"])
                did_win = (row["choice"] == outcome_key) and (amount > 0)

                user = group.get_or_create_user(player_id, name=names.get(player_id))
                user.apply_bet_result(bet_amount=amount, bet_pnl=bet_pnl, did_win=did_win)

            group.recompute_titles()

        return out


# ---- Example usage ----
if __name__ == "__main__":
    p = 0.02

    bets = pd.DataFrame(
        {
            "choice": ["A", "B", "C", "B", "A"],
            "amount": [10, 5, 20, 10, 15],
            "cut": [p, p, p, p, p],
        },
        index=["p1", "p2", "p3", "p4", "p5"],
    )

    print(bets, '\n')

    group = UserGroup()
    group.get_or_create_user("p1", name="Alice")
    group.get_or_create_user("p2", name="Bob")
    group.get_or_create_user("p3", name="Cara")
    group.get_or_create_user("p4", name="Dan")
    group.get_or_create_user("p5", name="Eve")
    group.recompute_titles()

    print("=== BEFORE ===")
    print(group)

    system = MultipleChoiceBetting(bets)
    result = system.settle("B", group=group)

    print("\n=== SETTLEMENT OUTPUT ===")
    print(result)

    print("\n=== AFTER ===")
    for u in group.users:
        print(u)
    print()
    print(group)
