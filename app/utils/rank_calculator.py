from app.models.student import Rank


def calculate_rank(total_points: int) -> Rank:
    """Calculate student rank based on total points.
    
    Rankings:
    - Bronze: 0pts
    - Silver: 150pts
    - Gold: 400pts
    - Platinum: 820pts
    - Diamond: 1250pts
    - Master: 1500pts
    """
    if total_points >= 1500:
        return Rank.MASTER
    elif total_points >= 1250:
        return Rank.DIAMOND
    elif total_points >= 820:
        return Rank.PLATINUM
    elif total_points >= 400:
        return Rank.GOLD
    elif total_points >= 150:
        return Rank.SILVER
    else:
        return Rank.BRONZE

