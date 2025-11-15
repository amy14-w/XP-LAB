from app.models.student import Rank


def calculate_rank(total_points: int) -> Rank:
    """Calculate student rank based on total points."""
    if total_points >= 1000:
        return Rank.PLATINUM
    elif total_points >= 400:
        return Rank.GOLD
    elif total_points >= 150:
        return Rank.SILVER
    else:
        return Rank.BRONZE

