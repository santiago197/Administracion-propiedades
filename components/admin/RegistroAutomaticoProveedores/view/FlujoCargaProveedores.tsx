import { useTranslation } from 'react-i18next';
import LayoutMenuFrm from '../../../../../SharedComponents/LayoutMenuFrm/View/LayoutMenuFrm'
import HeaderFrm from '../../../../../SharedComponents/MenuFrm/Components/Header/HeaderFrm'
import { CardUploadRut } from '../components/CardCargaRut/CardUploadRut';
import { useFlujoCarga } from '../hooks/useFlujoCarga'

const FlujoCargaProveedores = () => {
    const { load, NavigateToHomePage } = useFlujoCarga();
      const { t } = useTranslation(['gestion-proveedores']);
        
    return (
        <LayoutMenuFrm
            Load={load}
            childrenHeader={
                <HeaderFrm
                    NameHeader={t("gestion-proveedores:ocr-extraccion.titulo")}
                    showBackHeader={true}
                    onNavigateTo={NavigateToHomePage}
                />}
            childrenContent={
                <CardUploadRut />
            }
        />
    )
}

export default FlujoCargaProveedores;