import { useCallback, useRef, useState } from "react";

export const useResultadoExtraccion = () => {
    // Todas las secciones expandidas por defecto
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['informacionGeneral', 'informacionLegalContainer', 'informacionLegal', 'tributaria', 'representantes', 'socios', 'revisoresFiscales', 'contador'])
    );

    const handleAccordionChange = (panel: string) => () => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(panel)) {
                newSet.delete(panel);
            } else {
                newSet.add(panel);
            }
            return newSet;
        });
    };

    const allSections = ['informacionGeneral', 'informacionLegalContainer', 'informacionLegal', 'tributaria', 'representantes', 'socios', 'revisoresFiscales', 'contador'];
    const allExpanded = allSections.every(section => expandedSections.has(section));

    const handleToggleAll = () => {
        if (allExpanded) {
            setExpandedSections(new Set());
        } else {
            setExpandedSections(new Set(allSections));
        }
    };

    const openSection = (section: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            newSet.add(section);
            return newSet;
        });
    };

    const addRepresentanteRef = useRef<(() => void) | null>(null);
    const addSocioRef = useRef<(() => void) | null>(null);
    const addRevisorRef = useRef<(() => void) | null>(null);
    const addContadorRef = useRef<(() => void) | null>(null);

    const handleRegisterAddRepresentante = (fn: () => void) => { addRepresentanteRef.current = fn; };
    const handleRegisterAddSocio = (fn: () => void) => { addSocioRef.current = fn; };
    const handleRegisterAddRevisor = (fn: () => void) => { addRevisorRef.current = fn; };
    const handleRegisterAddContador = (fn: () => void) => { addContadorRef.current = fn; };

    const validateInfoGeneralRef = useRef<(() => boolean) | null>(null);
    const validateSociosRef = useRef<(() => boolean) | null>(null);
    const validateRevisoresRef = useRef<(() => boolean) | null>(null);
    const validateRepresentantesRef = useRef<(() => boolean) | null>(null);
    const validateContadorRef = useRef<(() => boolean) | null>(null);
    const validateTributariaRef = useRef<(() => boolean) | null>(null);

    const handleRegisterValidation = useCallback((validateFn: () => boolean) => {
        validateInfoGeneralRef.current = validateFn;
    }, []);

    const handleRegisterSociosValidation = useCallback((validateFn: () => boolean) => {
        validateSociosRef.current = validateFn;
    }, []);

    const handleRegisterRevisoresValidation = useCallback((validateFn: () => boolean) => {
        validateRevisoresRef.current = validateFn;
    }, []);

    const handleRegisterRepresentantesValidation = useCallback((validateFn: () => boolean) => {
        validateRepresentantesRef.current = validateFn;
    }, []);

    const handleRegisterContadorValidation = useCallback((validateFn: () => boolean) => {
        validateContadorRef.current = validateFn;
    }, []);

    const handleRegisterTributariaValidation = useCallback((validateFn: () => boolean) => {
        validateTributariaRef.current = validateFn;
    }, []);

    return {
        allExpanded,
        expandedSections,
        handleAccordionChange,
        handleRegisterContadorValidation,
        handleRegisterRepresentantesValidation,
        handleRegisterRevisoresValidation,
        handleRegisterSociosValidation,
        handleRegisterValidation,
        handleRegisterTributariaValidation,
        handleToggleAll,
        openSection,
        validateContadorRef,
        validateInfoGeneralRef,
        validateRepresentantesRef,
        validateRevisoresRef,
        validateSociosRef,
        validateTributariaRef,
        addRepresentanteRef,
        addSocioRef,
        addRevisorRef,
        addContadorRef,
        handleRegisterAddRepresentante,
        handleRegisterAddSocio,
        handleRegisterAddRevisor,
        handleRegisterAddContador,
    }
}