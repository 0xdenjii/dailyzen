import os
import random
import bcrypt
import psycopg2
from datetime import date, timedelta
from dotenv import load_dotenv
from faker import Faker

# --- CONFIGURATION ---
load_dotenv(dotenv_path='../.env')
DB_URL = "postgres://user:password@localhost:5432/dailyzen"
fake = Faker()

# --- THEME & DATA DEFINITIONS (Attack on Titan) ---
USER_INFO = {
    "username": "Mikasaa Ackerman",
    "email": "mikasa_a@surveycorps.dev",
    "password": "password123" 
}

TASKS = [
    {"name": "3D Maneuver Gear Training", "desc": "Advanced aerial combat drills.", "points": 25, "category": "Physical", "mandatory": True, "prob": 0.9},
    {"name": "Titan Slaying Simulation", "desc": "Practice nape strikes on dummies.", "points": 20, "category": "Physical", "mandatory": True, "prob": 0.95},
    {"name": "Intense Core Workout", "desc": "Abdominal and back strengthening.", "points": 15, "category": "Physical", "mandatory": False, "prob": 0.7},
    {"name": "Forced March (20km)", "desc": "Endurance training with full gear.", "points": 30, "category": "Physical", "mandatory": False, "prob": 0.4},
    {"name": "Maintain Equipment", "desc": "Sharpen blades, refill gas canisters.", "points": 5, "category": "Physical", "mandatory": True, "prob": 0.98},
    {"name": "Study Titan Weaknesses", "desc": "Review Hange's research notes.", "points": 15, "category": "Mental", "mandatory": False, "prob": 0.6},
    {"name": "Strategy Meeting with Levi", "desc": "Formation and squad tactics.", "points": 20, "category": "Mental", "mandatory": True, "prob": 0.8},
    {"name": "Read History of the Walls", "desc": "Understanding the world's secrets.", "points": 10, "category": "Mental", "mandatory": False, "prob": 0.3},
    {"name": "Mental Fortitude Practice", "desc": "Meditation to control emotions in battle.", "points": 15, "category": "Mental", "mandatory": False, "prob": 0.5},
]

GOALS = [
    {"desc": "Master the Thunder Spears", "cat": "Physical", "deadline": 90, "penalty": 50, "progress": 75},
    {"desc": "Protect Eren At All Costs", "cat": "Personal", "deadline": 365, "penalty": 200, "progress": 90},
    {"desc": "Uncover the Truth of the World", "cat": "Mental", "deadline": 180, "penalty": 100, "progress": 40},
]

# NEW: Define the badges to award Mikasa
# These values MUST match the ENUMs in your Rust backend
BADGES_TO_AWARD = [
    {"material": "Gold", "rank": "God", "focus": "Consistency", "threshold": 100},
    {"material": "Silver", "rank": "Demigod", "focus": "Volume", "threshold": 5000},
    {"material": "Gold", "rank": "God", "focus": "Physical", "threshold": 2500},
]


def seed_data():
    """Main function to connect to the DB and orchestrate seeding."""
    conn = None
    try:
        print("Connecting to the database...")
        # FIX: Use the DB_URL from .env file
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        print("Phase 1: Clearing old data and creating the user...")
        cur.execute("DELETE FROM users WHERE email = %s", (USER_INFO['email'],))
        
        hashed_password = bcrypt.hashpw(USER_INFO['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
            (USER_INFO['username'], USER_INFO['email'], hashed_password)
        )
        user_id = cur.fetchone()[0]
        print(f"User '{USER_INFO['username']}' created with ID: {user_id}")
        
        # --- Phases 2, 3, 4, 5 are the same as before ---
        print("\nPhase 2: Seeding Tasks and Goals...")
        task_ids = {}
        for task in TASKS:
            cur.execute("INSERT INTO tasks (user_id, name, description, points, category, is_mandatory) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id", (user_id, task['name'], task['desc'], task['points'], task['category'], task['mandatory']))
            task_id = cur.fetchone()[0]
            task_ids[task['name']] = task_id
        print(f"  - Seeded {len(task_ids)} tasks.")

        for goal in GOALS:
            deadline_date = date.today() + timedelta(days=goal['deadline'])
            cur.execute("INSERT INTO goals (user_id, description, category, deadline, penalty, progress) VALUES (%s, %s, %s, %s, %s, %s)", (user_id, goal['desc'], goal['cat'], deadline_date, goal['penalty'], goal['progress']))
        print(f"  - Seeded {len(GOALS)} goals.")

        print("\nPhase 3: Simulating one year of daily entries and notes...")
        today = date.today()
        total_points = 0
        all_entry_dates = []
        for i in range(365, -1, -1):
            current_date = today - timedelta(days=i)
            if random.random() < 0.85:
                day_has_entry = False
                for task in random.sample(TASKS, k=random.randint(1, 4)):
                    if random.random() < task['prob']:
                        cur.execute("INSERT INTO entries (user_id, task_id, date, points_awarded) VALUES (%s, %s, %s, %s)", (user_id, task_ids[task['name']], current_date, task['points']))
                        total_points += task['points']
                        day_has_entry = True
                if day_has_entry:
                    all_entry_dates.append(current_date)
                if day_has_entry and random.random() < 0.4:
                    cur.execute("INSERT INTO notes (user_id, date, content, mood) VALUES (%s, %s, %s, %s)", (user_id, current_date, fake.sentence(nb_words=15), random.randint(1, 5)))
        print(f"  - Simulation complete. Created entries for {len(all_entry_dates)} days.")

        print("\nPhase 4: Calculating final user aggregates...")
        # ... (streak calculation logic is the same)
        current_streak, longest_streak, last_entry_date = 0, 0, None
        if all_entry_dates:
            all_entry_dates.sort()
            streak_count, longest_streak = 1, 1
            for i in range(1, len(all_entry_dates)):
                if (all_entry_dates[i] - all_entry_dates[i-1]).days == 1:
                    streak_count += 1
                else: streak_count = 1
                if streak_count > longest_streak: longest_streak = streak_count
            if all_entry_dates[-1] >= today - timedelta(days=1):
                current_streak = streak_count
            last_entry_date = all_entry_dates[-1]

        print(f"  - Calculated Total Points: {total_points}")
        print(f"  - Calculated Current Streak: {current_streak}")
        print(f"  - Calculated Longest Streak: {longest_streak}")

        print("\nPhase 5: Updating user record with final stats...")
        cur.execute("UPDATE users SET total_points = %s, current_streak = %s, longest_streak = %s, last_entry_date = %s WHERE id = %s", (total_points, current_streak, longest_streak, last_entry_date, user_id))
        print("  - User record updated.")

        # --- NEW PHASE ---
        print("\nPhase 6: Seeding specific badges for the user...")
        for badge in BADGES_TO_AWARD:
            cur.execute(
                """
                INSERT INTO badges (user_id, material_tier, rank_tier, focus_factor, threshold)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, badge['material'], badge['rank'], badge['focus'], badge['threshold'])
            )
        print(f"  - Seeded {len(BADGES_TO_AWARD)} badges.")
        
        conn.commit()
        print("\nSeeding complete. Database has been populated successfully!")

    except psycopg2.Error as e:
        print(f"Database error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    seed_data()