from pydantic import BaseModel


class RagCounts(BaseModel):
    green: int
    amber: int
    red: int


class BudgetOverview(BaseModel):
    approved: float
    projected: float
    spent: float
    variance: float


class OverviewResponse(BaseModel):
    total_projects: int
    active: int
    completed: int
    blocked: int
    on_watchlist: int
    avg_completion: float
    rag: RagCounts
    budget: BudgetOverview
    data_version: str
    executive_summary: str
