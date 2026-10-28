import './styleCompiler/ww-style-page-5ac8292b-4a7d-4552-ae7e-c099f194016f.css';
/*__WW_PAGE_COMPONENT_IMPORTS_START__*/

// eslint-disable-next-line no-undef
import element_0ad8e7c3_e8a4_4122_910a_90b391310b87 from "@weweb-internal/ext-element-0ad8e7c3-e8a4-4122-910a-90b391310b87";
import element_1b1e2173_9b78_42cc_a8ee_a6167caea340 from "@weweb-internal/ext-element-1b1e2173-9b78-42cc-a8ee-a6167caea340";
import element_44d22ef1_0d8a_4749_8988_2ee7cc3abac4 from "@weweb-internal/ext-element-44d22ef1-0d8a-4749-8988-2ee7cc3abac4";
import element_b783dc65_d528_4f74_8c14_e27c934c39b1 from "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1";
import element_d7904e9d_fc9a_4d80_9e32_728e097879ad from "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad";

// eslint-disable-next-line no-undef
import section_99586bd3_2b15_4d6b_a025_6a50d07ca845 from "@weweb-internal/ext-section-99586bd3-2b15-4d6b-a025-6a50d07ca845";

/*__WW_PAGE_COMPONENT_IMPORTS_END__*/

import { registerSsrPageComponents } from '@/_front/rendering/ssrPageComponents';

let isRegistered = false;

export default async function registerPageComponents(app) {
    if (isRegistered) return;

    if (import.meta.env.SSR) {
        await registerSsrPageComponents(
            app,
            // eslint-disable-next-line no-undef
            /*__WW_SSR_PAGE_COMPONENT_DESCRIPTORS_START__*/
[
    {
        "baseId": "0ad8e7c3-e8a4-4122-910a-90b391310b87",
        "importPath": "@weweb-internal/ext-element-0ad8e7c3-e8a4-4122-910a-90b391310b87",
        "name": "wwobject-0ad8e7c3-e8a4-4122-910a-90b391310b87",
        "type": "element"
    },
    {
        "baseId": "1b1e2173-9b78-42cc-a8ee-a6167caea340",
        "importPath": "@weweb-internal/ext-element-1b1e2173-9b78-42cc-a8ee-a6167caea340",
        "name": "wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340",
        "type": "element"
    },
    {
        "baseId": "44d22ef1-0d8a-4749-8988-2ee7cc3abac4",
        "importPath": "@weweb-internal/ext-element-44d22ef1-0d8a-4749-8988-2ee7cc3abac4",
        "name": "wwobject-44d22ef1-0d8a-4749-8988-2ee7cc3abac4",
        "type": "element"
    },
    {
        "baseId": "b783dc65-d528-4f74-8c14-e27c934c39b1",
        "importPath": "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "name": "wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "type": "element"
    },
    {
        "baseId": "d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "importPath": "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "name": "wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "type": "element"
    },
    {
        "baseId": "99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "importPath": "@weweb-internal/ext-section-99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "name": "section-99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "type": "section"
    }
]
/*__WW_SSR_PAGE_COMPONENT_DESCRIPTORS_END__*/
        );
    } else {
        // eslint-disable-next-line no-undef
        app.component("wwobject-0ad8e7c3-e8a4-4122-910a-90b391310b87", element_0ad8e7c3_e8a4_4122_910a_90b391310b87);
app.component("wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340", element_1b1e2173_9b78_42cc_a8ee_a6167caea340);
app.component("wwobject-44d22ef1-0d8a-4749-8988-2ee7cc3abac4", element_44d22ef1_0d8a_4749_8988_2ee7cc3abac4);
app.component("wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1", element_b783dc65_d528_4f74_8c14_e27c934c39b1);
app.component("wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad", element_d7904e9d_fc9a_4d80_9e32_728e097879ad);

        // eslint-disable-next-line no-undef
        app.component("section-99586bd3-2b15-4d6b-a025-6a50d07ca845", section_99586bd3_2b15_4d6b_a025_6a50d07ca845);
    }

    isRegistered = true;
}
