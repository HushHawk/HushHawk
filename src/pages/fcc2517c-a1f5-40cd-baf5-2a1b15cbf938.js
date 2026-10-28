import './styleCompiler/ww-style-page-fcc2517c-a1f5-40cd-baf5-2a1b15cbf938.css';
/*__WW_PAGE_COMPONENT_IMPORTS_START*/
import element_f1b67d54_2716_43a4_a414_ab7f505c2ace from "@weweb-internal/ext-element-f1b67d54-2716-43a4-a414-ab7f505c2ace";

// eslint-disable-next-line no-undef
import element_59dca300_db78_42e4_a7a6_0cbf22d3cc82 from "@weweb-internal/ext-element-59dca300-db78-42e4-a7a6-0cbf22d3cc82";
import element_70a53858_53ca_40a5_ad88_c1cd33b5cc9f from "@weweb-internal/ext-element-70a53858-53ca-40a5-ad88-c1cd33b5cc9f";
import element_9ecb2cfc_cef7_4be8_b736_3e17a3b7e9ff from "@weweb-internal/ext-element-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff";
import element_b783dc65_d528_4f74_8c14_e27c934c39b1 from "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1";
import element_d2eeb897_ad95_49e4_8394_fe3f5c9a81fb from "@weweb-internal/ext-element-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb";
import element_d7904e9d_fc9a_4d80_9e32_728e097879ad from "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad";
import element_deb10a01_5eef_4aa1_9017_1b51c2ad6fd0 from "@weweb-internal/ext-element-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0";

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
        "baseId": "f1b67d54-2716-43a4-a414-ab7f505c2ace",
        "importPath": "@weweb-internal/ext-element-f1b67d54-2716-43a4-a414-ab7f505c2ace",
        "name": "wwobject-f1b67d54-2716-43a4-a414-ab7f505c2ace",
        "type": "element"
    },
    {
        "baseId": "59dca300-db78-42e4-a7a6-0cbf22d3cc82",
        "importPath": "@weweb-internal/ext-element-59dca300-db78-42e4-a7a6-0cbf22d3cc82",
        "name": "wwobject-59dca300-db78-42e4-a7a6-0cbf22d3cc82",
        "type": "element"
    },
    {
        "baseId": "70a53858-53ca-40a5-ad88-c1cd33b5cc9f",
        "importPath": "@weweb-internal/ext-element-70a53858-53ca-40a5-ad88-c1cd33b5cc9f",
        "name": "wwobject-70a53858-53ca-40a5-ad88-c1cd33b5cc9f",
        "type": "element"
    },
    {
        "baseId": "9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "importPath": "@weweb-internal/ext-element-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "name": "wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "type": "element"
    },
    {
        "baseId": "b783dc65-d528-4f74-8c14-e27c934c39b1",
        "importPath": "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "name": "wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "type": "element"
    },
    {
        "baseId": "d2eeb897-ad95-49e4-8394-fe3f5c9a81fb",
        "importPath": "@weweb-internal/ext-element-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb",
        "name": "wwobject-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb",
        "type": "element"
    },
    {
        "baseId": "d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "importPath": "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "name": "wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "type": "element"
    },
    {
        "baseId": "deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
        "importPath": "@weweb-internal/ext-element-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
        "name": "wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
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
        app.component("wwobject-f1b67d54-2716-43a4-a414-ab7f505c2ace", element_f1b67d54_2716_43a4_a414_ab7f505c2ace);
        app.component("wwobject-59dca300-db78-42e4-a7a6-0cbf22d3cc82", element_59dca300_db78_42e4_a7a6_0cbf22d3cc82);
app.component("wwobject-70a53858-53ca-40a5-ad88-c1cd33b5cc9f", element_70a53858_53ca_40a5_ad88_c1cd33b5cc9f);
app.component("wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff", element_9ecb2cfc_cef7_4be8_b736_3e17a3b7e9ff);
app.component("wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1", element_b783dc65_d528_4f74_8c14_e27c934c39b1);
app.component("wwobject-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb", element_d2eeb897_ad95_49e4_8394_fe3f5c9a81fb);
app.component("wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad", element_d7904e9d_fc9a_4d80_9e32_728e097879ad);
app.component("wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0", element_deb10a01_5eef_4aa1_9017_1b51c2ad6fd0);

        // eslint-disable-next-line no-undef
        app.component("section-99586bd3-2b15-4d6b-a025-6a50d07ca845", section_99586bd3_2b15_4d6b_a025_6a50d07ca845);
    }

    isRegistered = true;
}
