from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.database import db

router = APIRouter(prefix="/battles", tags=["Battles"])

VALID_MODES = {"1v1", "nvn", "marathon", "sudden_death"}


class CreateBattlePayload(BaseModel):
    group_id: str
    mode: str
    quiz_id: Optional[str] = None


class SubmitScorePayload(BaseModel):
    score: float
    accuracy: float
    time_taken_seconds: int


def _award_xp(user_id: str, email: str, xp: int):
    """Award XP to the user in memory_db.users and memory_db.profiles."""
    from app.core.database import memory_db
    if user_id in memory_db.users:
        memory_db.users[user_id]["xp"] = memory_db.users[user_id].get("xp", 0) + xp
    if user_id in memory_db.profiles:
        memory_db.profiles[user_id]["xp"] = memory_db.profiles[user_id].get("xp", 0) + xp
    memory_db._save_to_disk()


def _compute_xp(battle: Dict[str, Any], scores: List[Dict[str, Any]], user_score: Dict[str, Any]) -> int:
    """Compute XP earned by the submitting user."""
    total_xp = 10  # Participation XP always

    mode = battle.get("mode", "")
    accuracy = user_score.get("accuracy", 0)

    # Perfect score bonus
    if accuracy == 100:
        total_xp += 20

    finished_scores = [s for s in scores if s.get("score") is not None and s.get("user_id") != user_score["user_id"]]
    my_score_val = user_score.get("score", 0)

    if mode == "1v1":
        # Win if highest score among all submitted
        all_scores = [s for s in scores if s.get("score") is not None]
        if all_scores:
            max_score = max(s.get("score", 0) for s in all_scores)
            if my_score_val >= max_score:
                total_xp += 50

    elif mode == "nvn":
        # Teams: compare team avg accuracy
        teams = battle.get("teams", {})
        my_team = None
        for team_name, members in teams.items():
            if user_score["user_id"] in members or user_score["email"] in members:
                my_team = team_name
                break
        if my_team and teams:
            team_avgs = {}
            for team_name, members in teams.items():
                team_scores = [s for s in scores if s.get("user_id") in members or s.get("email") in members]
                if team_scores:
                    team_avgs[team_name] = sum(s.get("accuracy", 0) for s in team_scores) / len(team_scores)
                else:
                    team_avgs[team_name] = 0
            if my_team and team_avgs.get(my_team, 0) >= max(team_avgs.values()):
                total_xp += 35

    elif mode == "sudden_death":
        # Survive longest: user with no eliminated_at or latest eliminated_at
        eliminated_at = user_score.get("eliminated_at")
        if not eliminated_at:
            # Survived — award bonus
            total_xp += 25
        else:
            # Check if this user was eliminated after all others
            others_eliminated = [s.get("eliminated_at") for s in scores if s.get("user_id") != user_score["user_id"] and s.get("eliminated_at")]
            if others_eliminated and eliminated_at and eliminated_at >= max(others_eliminated):
                total_xp += 25

    return total_xp


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_battle(
    payload: CreateBattlePayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new battle for a group."""
    if payload.mode not in VALID_MODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode. Must be one of: {', '.join(VALID_MODES)}"
        )

    group = await db.get_group(payload.group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    members = await db.list_group_members(payload.group_id)
    is_member = any(
        m.get("user_id") == current_user["id"] or m.get("email") == current_user["email"]
        for m in members
    )
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a group member to start a battle.")

    quiz_id = payload.quiz_id
    if not quiz_id:
        from app.core.database import memory_db
        all_quizzes = list(memory_db.quizzes.values())
        if all_quizzes:
            quiz_id = all_quizzes[-1]["id"]

    battle = await db.create_battle(
        group_id=payload.group_id,
        mode=payload.mode,
        quiz_id=quiz_id,
        created_by=current_user["id"]
    )
    return {"success": True, "battle": battle, **battle}


@router.get("/group/{group_id}", response_model=List[Dict[str, Any]])
async def list_group_battles(
    group_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all battles for a group."""
    group = await db.get_group(group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")

    members = await db.list_group_members(group_id)
    is_member = any(
        m.get("user_id") == current_user["id"] or m.get("email") == current_user["email"]
        for m in members
    )
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a group member to view battles.")

    return await db.list_battles_for_group(group_id)


@router.get("/{battle_id}", response_model=Dict[str, Any])
async def get_battle(
    battle_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get battle state and all participant scores."""
    battle = await db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Battle not found.")

    scores = await db.list_battle_scores(battle_id)
    return {**battle, "scores": scores}


@router.post("/{battle_id}/join", status_code=status.HTTP_201_CREATED)
async def join_battle(
    battle_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Join a battle (adds the user as a pending participant)."""
    battle = await db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Battle not found.")
    if battle.get("status") == "finished":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This battle has already finished.")

    # Check already joined
    scores = await db.list_battle_scores(battle_id)
    already_in = any(
        s.get("user_id") == current_user["id"] or s.get("email") == current_user["email"]
        for s in scores
    )
    if already_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already joined this battle.")

    entry = await db.add_battle_score(
        battle_id=battle_id,
        user_id=current_user["id"],
        email=current_user["email"],
        name=current_user.get("display_name", current_user["email"].split("@")[0])
    )
    return {"success": True, "entry": entry}


@router.post("/{battle_id}/submit")
async def submit_score(
    battle_id: str,
    payload: SubmitScorePayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submit the user's score for a battle."""
    battle = await db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Battle not found.")
    if battle.get("status") == "finished":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This battle has already finished.")

    scores = await db.list_battle_scores(battle_id)
    my_entry = next(
        (s for s in scores if s.get("user_id") == current_user["id"] or s.get("email") == current_user["email"]),
        None
    )
    if not my_entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You must join the battle before submitting a score.")
    if my_entry.get("score") is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already submitted a score for this battle.")

    # Sudden death: set eliminated_at if accuracy < 80
    eliminated_at = None
    if battle.get("mode") == "sudden_death" and payload.accuracy < 80:
        from app.core.database import memory_db
        eliminated_at = memory_db.now_iso()

    updated_entry = await db.update_battle_score(
        battle_id=battle_id,
        user_id=current_user["id"],
        score=payload.score,
        accuracy=payload.accuracy,
        time_taken_seconds=payload.time_taken_seconds,
        eliminated_at=eliminated_at
    )

    # Recompute scores to determine XP
    all_scores = await db.list_battle_scores(battle_id)
    xp_earned = _compute_xp(battle, all_scores, updated_entry)
    _award_xp(current_user["id"], current_user["email"], xp_earned)

    # If all participants have completed their quiz attempts, mark battle as finished
    if all_scores and all(s.get("score") is not None for s in all_scores):
        await db.update_battle_status(battle_id, "finished")

    return {"success": True, "entry": updated_entry, "xp_earned": xp_earned}
