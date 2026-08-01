"""Pydantic schemas for B02 — Content Pillar agent output."""
from pydantic import BaseModel, field_validator


class PillarItem(BaseModel):
    """A single content pillar for the week."""
    name: str
    description: str
    weight: int  # Percentage (total across all pillars must = 100)
    angles: list[str]  # Exploitation angles for this pillar


class B02Output(BaseModel):
    """Structured output from B02 LLM call."""
    pillars: list[PillarItem]

    @field_validator("pillars")
    @classmethod
    def validate_pillars(cls, pillars: list[PillarItem]) -> list[PillarItem]:
        if len(pillars) < 2:
            raise ValueError(f"Cần tối thiểu 2 pillar, nhận được {len(pillars)}")
        if len(pillars) > 5:
            raise ValueError(f"Tối đa 5 pillar, nhận được {len(pillars)}")

        total_weight = sum(p.weight for p in pillars)
        if total_weight != 100:
            raise ValueError(f"Tổng weight phải = 100%, nhận được {total_weight}%")

        for p in pillars:
            if p.weight < 5:
                raise ValueError(f"Pillar '{p.name}' có weight {p.weight}% < 5% tối thiểu")

        return pillars
