import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom";

export const useFlujoCarga = () => {
    const [load, setLoad] = useState<boolean>(false);
    const navigate = useNavigate();
    const location = useLocation();

    const NavigateToHomePage = () => {
        const state = location.state as { from?: string } | null;
        navigate(state?.from ?? '/MiEmpresa', { replace: true });
    };

    return { load, setLoad, NavigateToHomePage }
}
