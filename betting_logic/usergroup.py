from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class User:
    user_id: str
    name: str

    total_wins: int = 0
    total_losses: int = 0
    pnl: float = 0.0
    greatest_win: float = 0.0
    greatest_loss: float = 0.0
    win_streak: int = 0
    number_of_bets: int = 0

    def apply_bet_result(self, bet_amount: float, bet_pnl: float, did_win: bool) -> None:
        """
        Updates this user's betting stats for ONE settled bet.

        Convention:
        - Count the bet only if bet_amount > 0 (change if you want $0 bets to count).
        - bet_pnl = payoff - bet_amount
        """
        if bet_amount <= 0:
            return  # change to `pass` if you want $0 bets to count

        self.number_of_bets += 1
        self.pnl += float(bet_pnl)

        if bet_pnl > self.greatest_win:
            self.greatest_win = float(bet_pnl)
        if bet_pnl < self.greatest_loss:
            self.greatest_loss = float(bet_pnl)

        if did_win:
            self.total_wins += 1
            self.win_streak += 1
        else:
            self.total_losses += 1
            self.win_streak = 0

    def __str__(self) -> str:
        return (
            f"User({self.name} | wins={self.total_wins}, losses={self.total_losses}, "
            f"PnL={self.pnl:.2f}, greatest_win={self.greatest_win:.2f}, "
            f"greatest_loss={self.greatest_loss:.2f}, streak={self.win_streak}, "
            f"bets={self.number_of_bets})"
        )


@dataclass
class UserGroup:
    users: List[User] = field(default_factory=list)

    # Titles are LISTS to allow ties
    jesters: List[User] = field(default_factory=list)       # most losses
    kings: List[User] = field(default_factory=list)         # most wins
    fools: List[User] = field(default_factory=list)         # greatest loss (most negative)
    addicts: List[User] = field(default_factory=list)       # most bets
    cowards: List[User] = field(default_factory=list)       # least bets
    capitalists: List[User] = field(default_factory=list)   # highest PnL

    def add_user(self, user: User) -> None:
        self.users.append(user)
        self.recompute_titles()

    def get_or_create_user(self, user_id: str, name: Optional[str] = None) -> User:
        for u in self.users:
            if u.user_id == user_id:
                # If we created this user earlier as just the ID, optionally update display name
                if name is not None and u.name == u.user_id:
                    u.name = name
                return u

        new_user = User(user_id=user_id, name=name or user_id)
        self.users.append(new_user)
        self.recompute_titles()
        return new_user

    @staticmethod
    def _ties(users: List[User], key, prefer_min: bool = False) -> List[User]:
        """
        Returns all users tied for best value of key(user).
        prefer_min=True means "smallest value wins"
        (e.g., greatest_loss most negative, coward least bets).
        """
        if not users:
            return []
        values = [key(u) for u in users]
        best = min(values) if prefer_min else max(values)
        return [u for u in users if key(u) == best]

    def recompute_titles(self) -> None:
        if not self.users:
            self.jesters = self.kings = self.fools = []
            self.addicts = self.cowards = self.capitalists = []
            return

        self.jesters = self._ties(self.users, key=lambda u: u.total_losses)
        self.kings = self._ties(self.users, key=lambda u: u.total_wins)

        # Fool = most negative greatest_loss
        self.fools = self._ties(self.users, key=lambda u: u.greatest_loss, prefer_min=True)

        self.addicts = self._ties(self.users, key=lambda u: u.number_of_bets)
        self.cowards = self._ties(self.users, key=lambda u: u.number_of_bets, prefer_min=True)
        self.capitalists = self._ties(self.users, key=lambda u: u.pnl)

    def __str__(self) -> str:
        def names(lst: List[User]) -> str:
            return ", ".join(u.name for u in lst) if lst else "None"

        return (
            "UserGroup Titles (ties allowed):\n"
            f"  Kings (most wins): {names(self.kings)}\n"
            f"  Jesters (most losses): {names(self.jesters)}\n"
            f"  Fools (biggest loss): {names(self.fools)}\n"
            f"  Addicts (most bets): {names(self.addicts)}\n"
            f"  Cowards (least bets): {names(self.cowards)}\n"
            f"  Capitalists (top PnL): {names(self.capitalists)}\n"
        )


# Optional: quick local test
if __name__ == "__main__":
    u1 = User("1", "Alice", total_wins=5, total_losses=3, pnl=120, greatest_win=70, greatest_loss=-30, win_streak=2, number_of_bets=8)
    u2 = User("2", "Bob", total_wins=5, total_losses=6, pnl=-50, greatest_win=40, greatest_loss=-60, win_streak=1, number_of_bets=12)
    u3 = User("3", "Charlie", total_wins=4, total_losses=1, pnl=200, greatest_win=100, greatest_loss=-10, win_streak=4, number_of_bets=5)

    group = UserGroup([u1, u2, u3])
    group.recompute_titles()
    print(group)
