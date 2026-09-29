from fastapi import APIRouter, HTTPException, status, Depends

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    VerifyResetTokenResponse,
    GenericMessageResponse,
)

from app.services.auth_service import (
    register_user,
    login_user,
    request_password_reset,
    reset_password_with_token,
    verify_reset_token_validity,
)

from app.dependencies.auth import get_current_user


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED
)
async def register(
    user_data: RegisterRequest
):

    user, error = await register_user(user_data)

    if error:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    if user_data.role == "HOSPITAL":
        return {
            "message": "Hospital registration submitted successfully. Your account is pending admin approval.",
            "user": user,
        }

    return {
        "message": "User registered successfully",
        "user": user,
    }


@router.post(
    "/login",
    response_model=TokenResponse
)
async def login(
    credentials: LoginRequest
):

    token, error, status_code = await login_user(
        credentials.email,
        credentials.password
    )

    if error or not token:

        raise HTTPException(
            status_code=status_code or status.HTTP_401_UNAUTHORIZED,
            detail=error or "Invalid email or password"
        )

    return token


@router.post(
    "/forgot-password",
    response_model=GenericMessageResponse,
)
async def forgot_password(
    data: ForgotPasswordRequest,
):
    """
    Generate password-reset token and dispatch reset instructions.
    Returns generic response to prevent account enumeration.
    """
    message = await request_password_reset(data.email)
    return {"message": message}


@router.get(
    "/verify-reset-token",
    response_model=VerifyResetTokenResponse,
)
async def verify_reset_token(
    token: str,
):
    """
    Verify reset token validity and return the authoritative account role.
    """
    valid, role = await verify_reset_token_validity(token)
    return {
        "valid": valid,
        "role": role,
    }


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
)
async def reset_password(
    data: ResetPasswordRequest,
):
    """
    Validate password reset token and update user's password.
    """
    success, error, role = await reset_password_with_token(
        token=data.token,
        new_password=data.new_password,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Password reset failed",
        )

    return {
        "message": "Password has been reset successfully.",
        "role": role,
    }


@router.get("/me")
async def get_me(
    current_user=Depends(get_current_user)
):

    return current_user