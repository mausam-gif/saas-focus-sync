from sqlalchemy.orm import Session
from .db.models import Task, User, Project, TaskStatus, KPIFormAssignment
from datetime import datetime, timedelta, timezone

# Task Mapping: designation -> stage -> list of tasks
# Stages: ANALYSIS, STRATEGY, EXECUTION, ITERATION, EVALUATION
TASK_MAPPING = {
    "manager": {
        "ANALYSIS": [
            {"title": "The Discovery Interview", "description": "Lead a deep-dive with the client to find their 'Pain Point.'"},
            {"title": "The 'Core Message' Extraction", "description": "Distill the client's rambling ideas into one single, powerful sentence."}
        ],
        "STRATEGY": [
            {"title": "Visual Tone Selection", "description": "Decide if the project should be 'High-Energy/Fast' or 'Soulful/Cinematic' based on personality."},
            {"title": "Budget & Timeline Alignment", "description": "Confirm exact delivery date and ensure scope fits NPR budget."}
        ],
        "EXECUTION": [
            {"title": "Resource Oversight", "description": "Check if videographers and designers have the gear/assets they need."},
            {"title": "Client updates", "description": "Provide a mid-execution update to the client on project status."}
        ],
        "ITERATION": [
            {"title": "Feedback Loop", "description": "Review the first draft and compile client/internal feedback for the team."}
        ],
        "EVALUATION": [
            {"title": "Project Debrief", "description": "Conduct a post-mortem to discuss what went well and what can be improved for next project."}
        ]
    },
    "designer": {
        "ANALYSIS": [
            {"title": "Brand Audit", "description": "Collect existing logos, fonts, and color hex codes. Ensure they aren't outdated."},
            {"title": "Competitor Visual Analysis", "description": "Research 3 competitors in Birtamode/Nepal to ensure our design stands out."}
        ],
        "STRATEGY": [
            {"title": "Mood Boarding", "description": "Create a 'Look-and-Feel' collage (colors, lighting styles, textures) for client review."}
        ],
        "EXECUTION": [
            {"title": "Asset Creation", "description": "Design primary visual assets based on the approved mood board."}
        ],
        "ITERATION": [
            {"title": "Design Refinement", "description": "Apply feedback from the manager to the visual designs."}
        ],
        "EVALUATION": [
            {"title": "Final Asset Export", "description": "Organize and export final source files and deliverables."}
        ]
    },
    "social media manager": {
        "ANALYSIS": [
            {"title": "Platform Research", "description": "Determine where the client's audience lives (TikTok? Facebook? Instagram?). Audit previous posts."},
            {"title": "Trend Gap Analysis", "description": "Find what is currently 'missing' in the client's niche."}
        ],
        "STRATEGY": [
            {"title": "Hook Identification", "description": "Identify 3 potential 'Hooks' that will stop the scroll for this specific target audience."}
        ],
        "EXECUTION": [
            {"title": "Content Distribution Plan", "description": "Draft the posting schedule and caption styles for the campaign."}
        ],
        "ITERATION": [
            {"title": "Engagement Tuning", "description": "Adjust hooks or captions based on early team feedback or test results."}
        ],
        "EVALUATION": [
            {"title": "Performance Report", "description": "Prepare a summary of projected reach and engagement based on content quality."}
        ]
    },
    "editor": {
        "ANALYSIS": [
            {"title": "Technical Audit", "description": "Review raw footage requirements and ensure hardware/software readiness."}
        ],
        "STRATEGY": [
            {"title": "Style Matching", "description": "Watch client's favorite 'Reference Videos' and determine technical difficulty (e.g., 3D tracking)."},
            {"title": "Storage Estimation", "description": "Calculate data generation (e.g., 3 hours 4K = 200GB). Ensure SSDs are ready."}
        ],
        "EXECUTION": [
            {"title": "Rough Cut Assembly", "description": "Complete the first assembly of the project including sync and basic cuts."}
        ],
        "ITERATION": [
            {"title": "Color/Audio Polish", "description": "Finalize color grading and sound design after cut approval."}
        ],
        "EVALUATION": [
            {"title": "Master Render", "description": "Perform high-quality master render and upload to delivery folder."}
        ]
    },
    "videographer": {
        "ANALYSIS": [
            {"title": "Equipment Inventory", "description": "Check if gimble, devices and lenses are charged clean and ready."}
        ],
        "STRATEGY": [
            {"title": "Site Survey", "description": "Check shooting location for power outlets and lighting conditions."},
            {"title": "Gear Requirement Check", "description": "Confirm if movement stabilizers (Flow 2 Pro) or tripods are needed."}
        ],
        "EXECUTION": [
            {"title": "Logistics Planning", "description": "Estimate travel time and secure any permits needed for drone/camera use."},
            {"title": "Primary Filming", "description": "Capture the primary footage according to the director's vision."}
        ],
        "ITERATION": [
            {"title": "B-Roll Pickups", "description": "Identify and capture any missing transition shots or b-roll."}
        ],
        "EVALUATION": [
            {"title": "DIT & Backup", "description": "Ensure all footage is safely offloaded and backed up in 3-2-1 system."}
        ]
    },
    "scriptwriter": {
        "ANALYSIS": [
            {"title": "Narrative Structure Planning", "description": "Outline the story flow and key emotional beats of the script."}
        ],
        "STRATEGY": [
            {"title": "Dialogue/Voiceover Draft", "description": "Create the first draft of the spoken lines or narration."}
        ],
        "EXECUTION": [
            {"title": "Final Script Handover", "description": "Polishing and delivering the final approved script for production."}
        ],
        "ITERATION": [
            {"title": "Script Tweaks", "description": "Adjust dialogue based on actor/director feedback during production."}
        ],
        "EVALUATION": [
            {"title": "Script Archive", "description": "Update the script to its 'As-Released' version for documentation."}
        ]
    }
}

def trigger_project_automation(db: Session, project: Project, is_new: bool = False):
    """
    Automatically assign tasks and KPIs based on project stage and user designations.
    """
    current_stage = project.status.upper()
    
    # 1. Get all active users
    users = db.query(User).all()
    
    for user in users:
        if not user.designation:
            continue
            
        designation_lower = user.designation.lower()
        
        # Check if we have tasks for this designation and stage
        if designation_lower in TASK_MAPPING and current_stage in TASK_MAPPING[designation_lower]:
            tasks_to_assign = TASK_MAPPING[designation_lower][current_stage]
            
            for task_data in tasks_to_assign:
                # Check if task already exists (prevent duplicates)
                existing_task = db.query(Task).filter(
                    Task.project_id == project.id,
                    Task.assigned_user == user.id,
                    Task.title == task_data["title"]
                ).first()
                
                if not existing_task:
                    new_task = Task(
                        title=task_data["title"],
                        description=task_data["description"],
                        project_id=project.id,
                        assigned_user=user.id,
                        due_date=datetime.now(timezone.utc) + timedelta(days=3),
                        status=TaskStatus.TODO
                    )
                    db.add(new_task)
    
    # 2. Automated KPI Form Assignment
    # If project moves to EVALUATION, assign a general Project Evaluation KPI form to everyone
    if current_stage == "EVALUATION":
        # Find any KPI Form with 'Evaluation' in the title
        from .db.models import KPIForm
        evaluation_form = db.query(KPIForm).filter(KPIForm.title.ilike("%Evaluation%"), KPIForm.is_active == True).first()
        
        if evaluation_form:
            # Get members involved (those with tasks in this project)
            involved_user_ids = [t.assigned_user for t in project.tasks]
            # Also include any managers/admins if needed, but for now just task assignees
            
            for user_id in set(involved_user_ids):
                # Check if already assigned
                existing_assignment = db.query(KPIFormAssignment).filter(
                    KPIFormAssignment.form_id == evaluation_form.id,
                    KPIFormAssignment.employee_id == user_id,
                    KPIFormAssignment.is_submitted == False
                ).first()
                
                if not existing_assignment:
                    new_assignment = KPIFormAssignment(
                        form_id=evaluation_form.id,
                        employee_id=user_id,
                        assigned_by=1, # System/Admin
                        due_date=datetime.now(timezone.utc) + timedelta(days=7),
                        is_submitted=False
                    )
                    db.add(new_assignment)

    db.commit()
