from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models import Admin, ChargingOperator, User
from app.schemas import LoginRequest, OperatorRegister, TokenResponse, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        address=payload.address,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register-operator", status_code=status.HTTP_201_CREATED)
def register_operator(payload: OperatorRegister, db: Session = Depends(get_db)):
    if db.query(ChargingOperator).filter(ChargingOperator.contact_email == payload.contact_email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Operator email already registered")
    if db.query(Admin).filter(Admin.email == payload.admin_email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin email already registered")

    operator = ChargingOperator(
        operator_name=payload.operator_name,
        contact_email=payload.contact_email,
        phone=payload.phone,
    )
    db.add(operator)
    db.flush()

    admin = Admin(
        operator_id=operator.id,
        name=payload.admin_name,
        email=payload.admin_email,
        password_hash=hash_password(payload.admin_password),
        role="super_admin",
    )
    db.add(admin)
    db.commit()
    return {"operator_id": operator.id, "admin_id": admin.id}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user and verify_password(payload.password, user.password_hash):
        token = create_access_token(subject=user.id, role="driver")
        return TokenResponse(access_token=token, role="driver")

    admin = db.query(Admin).filter(Admin.email == payload.email).first()
    if admin and verify_password(payload.password, admin.password_hash):
        token = create_access_token(subject=admin.id, role="admin", operator_id=admin.operator_id)
        return TokenResponse(access_token=token, role="admin", admin_role=admin.role)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
