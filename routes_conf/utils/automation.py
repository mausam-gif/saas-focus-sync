from sqlalchemy.orm import Session
from db.models import Task, User, Project, TaskStatus, KPIFormAssignment
from datetime import datetime, timedelta, timezone

# Task Mapping: designation -> stage -> list of tasks
# New Stages: BRIEFING, PRE-PRODUCTION, PRODUCTION, POST-PRODUCTION, REVIEW & REVISION, FINAL DELIVERY
TASK_MAPPING = {
    "manager": {
        "BRIEFING": [
            {"title": "The Discovery Interview", "description": "Lead a deep-dive with the client to find their 'Pain Point.'"},
            {"title": "The 'Core Message' Extraction", "description": "Distill the client's rambling ideas into one single, powerful sentence."}
        ],
        "PRE-PRODUCTION": [
            {"title": "Visual Tone Selection", "description": "Decide if the project should be 'High-Energy/Fast' or 'Soulful/Cinematic' based on personality."},
            {"title": "Budget & Timeline Alignment", "description": "Confirm exact delivery date and ensure scope fits NPR budget."}
        ],
        "PRODUCTION": [
            {"title": "Resource Oversight", "description": "Check if videographers and designers have the gear/assets they need."},
            {"title": "Client updates", "description": "Provide a mid-execution update to the client on project status."}
        ],
        "POST-PRODUCTION": [
            {"title": "First Draft Review", "description": "Review the initial assembly and ensure it aligns with the core message."}
        ],
        "REVIEW & REVISION": [
            {"title": "Feedback Loop", "description": "Review the first draft and compile client/internal feedback for the team."}
        ],
        "FINAL DELIVERY": [
            {"title": "Project Debrief", "description": "Conduct a post-mortem to discuss what went well and what can be improved for next project."}
        ]
    },
    "designer": {
        "BRIEFING": [
            {"title": "Brand Audit", "description": "Collect existing logos, fonts, and color hex codes. Ensure they aren't outdated."},
            {"title": "Competitor Visual Analysis", "description": "Research 3 competitors in Birtamode/Nepal to ensure our design stands out."}
        ],
        "PRE-PRODUCTION": [
            {"title": "Mood Boarding", "description": "Create a 'Look-and-Feel' collage (colors, lighting styles, textures) for client review."}
        ],
        "PRODUCTION": [
            {"title": "Asset Creation", "description": "Design primary visual assets based on the approved mood board."}
        ],
        "POST-PRODUCTION": [
            {"title": "Design Refinement", "description": "Apply feedback from the manager to the visual designs."}
        ],
        "REVIEW & REVISION": [
            {"title": "Revision Polish", "description": "Apply final visual tweaks based on client feedback."}
        ],
        "FINAL DELIVERY": [
            {"title": "Final Asset Export", "description": "Organize and export final source files and deliverables."}
        ]
    },
    "social media manager": {
        "BRIEFING": [
            {"title": "Platform Research", "description": "Determine where the client's audience lives (TikTok? Facebook? Instagram?). Audit previous posts."},
            {"title": "Trend Gap Analysis", "description": "Find what is currently 'missing' in the client's niche."}
        ],
        "PRE-PRODUCTION": [
            {"title": "Hook Identification", "description": "Identify 3 potential 'Hooks' that will stop the scroll for this specific target audience."}
        ],
        "PRODUCTION": [
            {"title": "Content Distribution Plan", "description": "Draft the posting schedule and caption styles for the campaign."}
        ],
        "POST-PRODUCTION": [
            {"title": "Engagement Tuning", "description": "Adjust hooks or captions based on early team feedback or test results."}
        ],
        "REVIEW & REVISION": [
            {"title": "Caption Revisions", "description": "Finalize copy and hooks based on internal review."}
        ],
        "FINAL DELIVERY": [
            {"title": "Performance Report", "description": "Prepare a summary of projected reach and engagement based on content quality."}
        ]
    },
    "editor": {
        "BRIEFING": [
            {"title": "Technical Audit", "description": "Review raw footage requirements and ensure hardware/software readiness."}
        ],
        "PRE-PRODUCTION": [
            {"title": "Style Matching", "description": "Watch client's favorite 'Reference Videos' and determine technical difficulty (e.g., 3D tracking)."},
            {"title": "Storage Estimation", "description": "Calculate data generation (e.g., 3 hours 4K = 200GB). Ensure SSDs are ready."}
        ],
        "PRODUCTION": [
            {"title": "Rough Cut Assembly", "description": "Complete the first assembly of the project including sync and basic cuts."}
        ],
        "POST-PRODUCTION": [
            {"title": "Color/Audio Polish", "description": "Finalize color grading and sound design after cut approval."}
        ],
        "REVIEW & REVISION": [
            {"title": "Correction Cycle", "description": "Apply specific time-coded feedback from the client."}
        ],
        "FINAL DELIVERY": [
            {"title": "Master Render", "description": "Perform high-quality master render and upload to delivery folder."}
        ]
    },
    "videographer": {
        "BRIEFING": [
            {"title": "Equipment Inventory", "description": "Check if gimble, devices and lenses are charged clean and ready."}
        ],
        "PRE-PRODUCTION": [
            {"title": "Site Survey", "description": "Check shooting location for power outlets and lighting conditions."},
            {"title": "Gear Requirement Check", "description": "Confirm if movement stabilizers (Flow 2 Pro) or tripods are needed."}
        ],
        "PRODUCTION": [
            {"title": "Logistics Planning", "description": "Estimate travel time and secure any permits needed for drone/camera use."},
            {"title": "Primary Filming", "description": "Capture the primary footage according to the director's vision."}
        ],
        "POST-PRODUCTION": [
            {"title": "B-Roll Pickups", "description": "Identify and capture any missing transition shots or b-roll."}
        ],
        "REVIEW & REVISION": [
            {"title": "Additional Pickups", "description": "Capture any additional shots requested during the review stage."}
        ],
        "FINAL DELIVERY": [
            {"title": "DIT & Backup", "description": "Ensure all footage is safely offloaded and backed up in 3-2-1 system."}
        ]
    },
    "scriptwriter": {
        "BRIEFING": [
            {"title": "Narrative Structure Planning", "description": "Outline the story flow and key emotional beats of the script."}
        ],
        "PRE-PRODUCTION": [
            {"title": "Dialogue/Voiceover Draft", "description": "Create the first draft of the spoken lines or narration."}
        ],
        "PRODUCTION": [
            {"title": "Final Script Handover", "description": "Polishing and delivering the final approved script for production."}
        ],
        "POST-PRODUCTION": [
            {"title": "Script Tweaks", "description": "Adjust dialogue based on actor/director feedback during production."}
        ],
        "REVIEW & REVISION": [
            {"title": "Copy Polish", "description": "Finalize any text overlays or subtitles based on review."}
        ],
        "FINAL DELIVERY": [
            {"title": "Script Archive", "description": "Update the script to its 'As-Released' version for documentation."}
        ]
    }
}

def trigger_project_automation(db: Session, project: Project, is_new: bool = False):
    """
    Automatically assign tasks and KPIs based on project stage and user designations.
    Now supports both dynamic database-driven automations and legacy hardcoded ones.
    """
    current_stage = project.status.upper()
    org_id = project.organization_id
    
    # 1. Try to find dynamic automations first
    from db.models import ProjectStep, StepAutomation, Task, User, TaskStatus, KPIFormAssignment
    
    # Check if this project is linked to a dynamic step
    dynamic_step = None
    if project.project_step_id:
        dynamic_step = db.query(ProjectStep).get(project.project_step_id)
    else:
        # Try to find step by name for this org
        dynamic_step = db.query(ProjectStep).filter(
            ProjectStep.organization_id == org_id,
            ProjectStep.name.ilike(current_stage)
        ).first()

    dynamic_automations = []
    if dynamic_step:
        dynamic_automations = db.query(StepAutomation).filter(StepAutomation.step_id == dynamic_step.id).all()

    # 2. Get all active users in the org
    users = db.query(User).filter(User.organization_id == org_id, User.is_active == True).all()
    
    # Track if we found any dynamic automations to decide if we should skip legacy
    using_dynamic = len(dynamic_automations) > 0

    if using_dynamic:
        # Use dynamic automations from DB
        for auto in dynamic_automations:
            # Find users with this designation
            target_users = [u for u in users if u.designation and u.designation.lower() == auto.designation.lower()]
            for target_user in target_users:
                # Prevent duplicates
                existing = db.query(Task).filter(
                    Task.project_id == project.id,
                    Task.assigned_user == target_user.id,
                    Task.title == auto.task_title
                ).first()
                
                if not existing:
                    new_task = Task(
                        title=auto.task_title,
                        description=auto.task_description,
                        project_id=project.id,
                        assigned_user=target_user.id,
                        due_date=datetime.now(timezone.utc) + timedelta(days=auto.due_days_offset),
                        status=TaskStatus.TODO,
                        priority=auto.priority
                    )
                    db.add(new_task)
    else:
        # FALLBACK: Use legacy hardcoded TASK_MAPPING
        for user in users:
            if not user.designation:
                continue
            designation_lower = user.designation.lower()
            if designation_lower in TASK_MAPPING and current_stage in TASK_MAPPING[designation_lower]:
                tasks_to_assign = TASK_MAPPING[designation_lower][current_stage]
                for task_data in tasks_to_assign:
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
    if current_stage == "EVALUATION" or (dynamic_step and dynamic_step.name.upper() == "EVALUATION"):
        from db.models import KPIForm
        evaluation_form = db.query(KPIForm).filter(
            KPIForm.title.ilike("%Evaluation%"), 
            KPIForm.is_active == True,
            # If multiple evaluation forms, try to find one for this org or a global one
        ).first()
        
        if evaluation_form:
            involved_user_ids = [t.assigned_user for t in project.tasks]
            for user_id in set(involved_user_ids):
                existing_assignment = db.query(KPIFormAssignment).filter(
                    KPIFormAssignment.form_id == evaluation_form.id,
                    KPIFormAssignment.employee_id == user_id,
                    KPIFormAssignment.is_submitted == False
                ).first()
                if not existing_assignment:
                    new_assignment = KPIFormAssignment(
                        form_id=evaluation_form.id,
                        employee_id=user_id,
                        assigned_by=1,
                        due_date=datetime.now(timezone.utc) + timedelta(days=7),
                        is_submitted=False
                    )
                    db.add(new_assignment)

    db.commit()
