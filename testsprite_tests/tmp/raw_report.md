
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** Gestão_Pedidos V01
- **Date:** 2026-02-17
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Create a new order from the order list and verify it appears in the list
- **Test Code:** [TC001_Create_a_new_order_from_the_order_list_and_verify_it_appears_in_the_list.py](./TC001_Create_a_new_order_from_the_order_list_and_verify_it_appears_in_the_list.py)
- **Test Error:** Test result: FAILED to verify listing. Summary:
- Goal: Verify user can start at dashboard, create a new order, save it, and see it listed.
- Steps completed (7/8): Navigate to /login; enter email; enter password; click Login; verify dashboard loaded; click Novo Pedido and create order (client created and FINALIZAR ABERTURA clicked).
- Remaining verification: Confirm the new order for 'Cliente Teste E2E' appears in the orders list.
- Outcome: Verification failed — the string 'Cliente Teste E2E' was NOT FOUND in the orders list after searching and scanning the orders page.
- Key interactions: Client created with Nome='Cliente Teste E2E', CNPJ='12.345.678/0001-95', Telefone='(11) 91234-5678', E-mail='cliente.teste.e2e@example.com'; FINALIZAR ABERTURA clicked.
- Failures observed: multiple stale/non-interactable element click attempts (indexes 937, 3244, 5025) and one failed orders-list click (index 5143). Search for the client returned NOT FOUND.
- Recommendations: 1) Retry refreshing the orders list (full page reload) and re-run the search; 2) Check backend/API that lists orders to confirm the order was created server-side; 3) If the order exists server-side but is not shown, investigate caching/filters/status (the new order may have a different status/filter applied).
Conclusion: The flow to create and submit the order completed, but the final verification that the order appears in the orders list failed. Test marked as unsuccessful (success=false).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/ada84788-9f63-4df2-9caa-3acc9856e958
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Complete new order form and save successfully
- **Test Code:** [TC002_Complete_new_order_form_and_save_successfully.py](./TC002_Complete_new_order_form_and_save_successfully.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/6039def3-a1c9-4978-8ec7-f2f46f21ba0f
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 After saving, verify the created order is visible in the order list
- **Test Code:** [TC003_After_saving_verify_the_created_order_is_visible_in_the_order_list.py](./TC003_After_saving_verify_the_created_order_is_visible_in_the_order_list.py)
- **Test Error:** Test ended without creating the order. Summary of findings:
- Login completed and orders page visible.
- 'Novo Pedido' form opened successfully (multiple attempts).
- Attempted to add client 'Cliente Teste Lista' but 'Adicionar Novo' click failed repeatedly (elements not interactable / stale). Attempts: 3. Client was typed 3 times. Save was not attempted because client selection failed.
- New order was not saved and therefore not visible in the orders list.
Recommendations to proceed:
1) Create the client first via Cadastros (menu) then retry creating the order. 2) Ensure the client-add modal/selector is fully loaded (add longer wait) and that no overlays block the add button. 3) If automation must continue, try alternate flow: create client record via the Cadastros screen then re-run order creation. 4) Check browser console for SPA errors that may be causing stale/uninteractable elements.
Provide instructions if a retry with a different approach should be attempted or if manual intervention is preferred.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/6088f9cb-e1b0-47e7-bd13-371281fc3190
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Validate required client field when saving a new order
- **Test Code:** [TC004_Validate_required_client_field_when_saving_a_new_order.py](./TC004_Validate_required_client_field_when_saving_a_new_order.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/49d83b65-9b77-44b6-a589-c2d4f226caa9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Filter orders by status from the order list
- **Test Code:** [TC005_Filter_orders_by_status_from_the_order_list.py](./TC005_Filter_orders_by_status_from_the_order_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/6e3f13b8-8c82-4689-8ad6-f8a11dc88017
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Change status filter and verify results change accordingly
- **Test Code:** [TC006_Change_status_filter_and_verify_results_change_accordingly.py](./TC006_Change_status_filter_and_verify_results_change_accordingly.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/581ebb16-563e-46aa-8dc0-9063192144e0
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Access CRM dashboard and view sales performance charts
- **Test Code:** [TC007_Access_CRM_dashboard_and_view_sales_performance_charts.py](./TC007_Access_CRM_dashboard_and_view_sales_performance_charts.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/6a2f8e23-08e4-45bd-89ed-2ed18f5af526
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Filter financial dashboard by date range and salesperson and see charts update
- **Test Code:** [TC008_Filter_financial_dashboard_by_date_range_and_salesperson_and_see_charts_update.py](./TC008_Filter_financial_dashboard_by_date_range_and_salesperson_and_see_charts_update.py)
- **Test Error:** Final verification report (task: verify that applying date + salesperson filters updates CRM financial/sales charts)

Result: FAILURE (filters did not update charts)

Evidence and findings:
- Current page: CRM & VENDAS, Performance view active (button visible/highlighted).
- Date input elements present (shadow inputs): indexes shown in page: 4698 (start), 4700 (end). Performance button index: 4705.
- Salesperson dropdown/control: NOT FOUND in interactive elements or page text (no selection control available).
- Date values (2026-01-01 and 2026-01-31): multiple attempts typed into date inputs, but the texts are NOT visible on the page after attempts; verification failed.
- Charts: show 'Nenhum dado disponível.' and zero values (Total de Orçamentos 0, Taxa de Conversão Global 0%, Valor Total em Propostas R$ 0,00) — indicates no data returned for the applied filters.
- Extracted evidence files: extracted_content_0.md and extracted_content_1.md contain the page text snippets confirming 'Nenhum dado disponível.' and that no salesperson dropdown was found.

Observed blockers / objective failure statements:
- Salesperson dropdown not found on page.
- Entered dates did not persist or become visible after entry; date verification failed.
- Charts report no data ('Nenhum dado disponível.'), so no update could be observed for the requested filters.

Remaining steps (from user checklist) that could not be completed due to blockers:
- Select an option from the salesperson dropdown (control missing) - 0/1
- Click Apply to apply filters and verify charts update - 0/1
- Verify '2026-01-01' and '2026-01-31' visible on page after applying filters - 0/2

Suggested next actions (if further troubleshooting is desired):
1) Confirm whether the salesperson filter/control should be available in this environment/account — check permissions or data seeding.
2) Verify that the date inputs accept and persist values by manually interacting with the app or using a different method (e.g., open datepicker widget instead of typing).
3) Check backend/data availability for the selected date range and salesperson (the dashboard may correctly show 'Nenhum dado disponível.' if no data exists).
4) If the salesperson selector is behind another control (e.g., collapsed filter panel), inspect and expand any filters panel or consult the UI design to find the selector.

Files to support this report: ["extracted_content_0.md", "extracted_content_1.md"]


Attachments:

extracted_content_0.md:
<url>
http://localhost:3000/login#/
</url>
<query>
Check if the texts '2026-01-01' and '2026-01-31' are visible on this CRM Performance page. Also report any visible chart titles, values, or the presence of the phrase 'Nenhum dado disponível.' Return any text snippets that indicate whether the charts updated for the given filters.
</query>
<result>
2026-01-01: NOT FOUND
2026-01-31: NOT FOUND

Visible chart/section titles and labels:
- "Desempenho por Vendedor"
- "Atividade Recente"
- "Total de Orçamentos"
- "Taxa de Conversão Global"
- "Valor Total em Propostas"

Visible values:
- "Total de Orçamentos 0"
- "Taxa de Conversão Global 0%"
- "Valor Total em Propostas R$ 0,00"

Presence of phrase:
- "Nenhum dado disponível." — PRESENT (under "Desempenho por Vendedor")

Text snippets indicating charts did not update / loading error:
- "Ops! Algo deu errado ao carregar."
- "Por favor, envie um print desta tela para o suporte."
- "Nenhum dado disponível."

No text snippet indicates the charts successfully updated for the given filters; available text indicates an error/no data or zero values.
</result>

extracted_content_1.md:
<url>
http://localhost:3000/login#/
</url>
<query>
Check whether the texts '2026-01-01' and '2026-01-31' are visible on the page. Return any visible chart titles, values, and the presence of 'Nenhum dado disponível.' Also report if a salesperson dropdown or any salesperson selection control is present in the page text or interactive elements.
</query>
<result>
Dates presence
- '2026-01-01': not visible on the page.
- '2026-01-31': not visible on the page.

Visible chart/section titles and values
- Total de Orçamentos — 0
- Taxa de Conversão Global — 0%
- Valor Total em Propostas — R$ 0,00
- Desempenho por Vendedor — Nenhum dado disponível.
- Atividade Recente — table headers shown ("Orçamento | Cliente | Status | Valor"), no rows/values visible
- Motivos de Perda (Pedido não aprovado) — "[PREÇO] Cliente achou o valor do frete abusivo para a região." — 1 ocorrências

Presence of the text 'Nenhum dado disponível.'
- Present (exact text appears under "Desempenho por Vendedor").

Salesperson dropdown / selection control
- No salesperson dropdown or any salesperson selection control is present in the page text or visible interactive elements.
</result>
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/a176bc2d-5be9-42c8-947a-13e637bb5ab1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Invalid date range shows validation error when applying financial filter
- **Test Code:** [TC009_Invalid_date_range_shows_validation_error_when_applying_financial_filter.py](./TC009_Invalid_date_range_shows_validation_error_when_applying_financial_filter.py)
- **Test Error:** Result of verification:
- Action performed: Start date set to 2026-02-10 and End date set to 2026-02-01, then Filters button clicked to trigger validation.
- Evidence from page state:
  - Date input (index 1095) value = 2026-02-10
  - Date input (index 1098) value = 2026-02-01
  - No visible validation/error message found on the page for an invalid date range. No occurrences of 'Invalid date range' or Portuguese variants ('Intervalo de datas inválido', 'Data final anterior à data inicial', 'Período inválido') were detected in the visible text.
  - The page displays the normal empty-results message ('Nenhum pedido encontrado com os filtros selecionados.') and the date inputs show the entered dates (screenshot shows 02/10/2026 and 02/01/2026 in the UI).
Conclusion: The application did NOT display a visible validation error when an end date earlier than the start date was selected. The expected validation did not occur. Next steps (optional): file a bug report or notify developers to add client-side validation for date range or server-side validation message display.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/c802332f-d4aa-48e3-be42-1eb517d713b9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Attempt to apply filter with missing date fields and see validation feedback
- **Test Code:** [TC010_Attempt_to_apply_filter_with_missing_date_fields_and_see_validation_feedback.py](./TC010_Attempt_to_apply_filter_with_missing_date_fields_and_see_validation_feedback.py)
- **Test Error:** Resultado da verificação: Falhou — Não foi encontrada nenhuma mensagem de validação visível relacionada a 'data'/'date' quando os campos de data estavam vazios.

Resumo das ações realizadas:
- Navegado para /login e autenticado com as credenciais de teste.
- Aberto CRM -> Financeiro -> Contas a Receber e painel de Filtros (campos de data visíveis: 'Data Inicial' e 'Data Final').
- Tentativas de acionar a validação: 4 tentativas de “Aplicar”/pesquisar (uma tentativa em elemento stale index=610 falhou; três cliques em controles de busca/aplicar executados). Em todas as tentativas, a extração do texto visível retornou apenas rótulos de campo (por ex. 'Data Inicial', 'Data Final') e não houve exibição de mensagem de erro/validação contendo as palavras 'data' ou 'date'.
- URL atual do tab: http://localhost:3000/login#/receivables (não contém '/crm').

Evidências coletadas:
- Extrações repetidas do texto da página retornaram somente os rótulos das entradas de data ('Data Inicial', 'Data Final') e nenhuma ocorrência adicional de 'data' ou 'date'.
- Elementos relevantes visíveis no DOM (último estado): search/apply span index 5373; date inputs indices 5397, 5418; Limpar button 5419.

Conclusão e recomendação:
- Conclusão: O fluxo de filtros financeiros não apresentou feedback de validação visível quando as datas obrigatórias estavam vazias durante as tentativas realizadas.
- Recomendações: se o comportamento esperado é mostrar uma mensagem de validação, investigar o front-end (event listeners do botão 'Aplicar' / controle de busca, possíveis condicionais que impedem a validação) ou revisar logs/console para erros JS. Como alternativa, testar preenchendo manualmente um campo de data para confirmar a ação do filtro.

Status final da tarefa: solicitação concluída com resultado = false (validação não observada).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/0ee85b52-2475-4b71-b8a8-99aebab7a4ff
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Sales performance section remains visible after applying filters
- **Test Code:** [TC011_Sales_performance_section_remains_visible_after_applying_filters.py](./TC011_Sales_performance_section_remains_visible_after_applying_filters.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/455de059-cceb-4bcf-bfa0-ffbb9b45be65
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 View budgets list from Orçamentos page
- **Test Code:** [TC012_View_budgets_list_from_Oramentos_page.py](./TC012_View_budgets_list_from_Oramentos_page.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/d7eafe43-b0e7-4b8b-b8e5-5f466f67e834
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Open a budget from the list and view budget details
- **Test Code:** [TC013_Open_a_budget_from_the_list_and_view_budget_details.py](./TC013_Open_a_budget_from_the_list_and_view_budget_details.py)
- **Test Error:** Resumo do teste e resultado:

- Credenciais usadas: cristalbrindes@cristalbrindes.com.br / @SucessoCristal09!
- Login: realizado com sucesso (aplicação SPA carregada). URL atual do tab: http://localhost:3000/login#/orcamentos
- Navegação: página 'Orçamentos' aberta (menu clicado). Elementos de filtro e busca estão visíveis (input de busca, selects de vendedor/status, datas, botão 'Novo Orçamento').
- Conteúdo da tabela de orçamentos (visível): mensagem de erro/loading e sem linhas. Texto capturado da tabela:
  - "Ops! Algo deu errado ao carregar. Por favor, envie um print desta tela para o suporte."
  - Cabeçalho da tabela listado, seguido por linha: "Carregando..."
  - Rodapé: "Mostrando 1 até 0 de 0 resultados"
- Resultado da verificação solicitada: Falha — não foi possível abrir um item de orçamento porque não há nenhuma linha disponível na lista para clicar.

Conclusão e recomendações:
- Teste da ação "clicar no primeiro orçamento e ver detalhes" não pôde ser completado devido à ausência de linhas na tabela (provavelmente erro de carregamento/backend ou dataset vazio).
- Próximos passos sugeridos para permitir o teste: 1) criar um orçamento de teste (via UI 'Novo Orçamento' ou fixture), 2) verificar logs/backend para o erro 'Ops! Algo deu errado ao carregar.' ou 3) garantir que a API de orçamentos retorne dados.

Estado final: pedido do usuário (verificar que um usuário pode abrir um orçamento e ver detalhes) não foi validado — sucesso=false.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/361754b7-27a1-4543-9d4d-6e564feab35a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Budget details show key information fields
- **Test Code:** [TC014_Budget_details_show_key_information_fields.py](./TC014_Budget_details_show_key_information_fields.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/377d69f3-54a4-4cf1-b15d-3ca4a0711e07
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Apply a filter that returns no results shows empty state message
- **Test Code:** [TC015_Apply_a_filter_that_returns_no_results_shows_empty_state_message.py](./TC015_Apply_a_filter_that_returns_no_results_shows_empty_state_message.py)
- **Test Error:** Verification result: FAILED — explicit empty-state message 'No budgets found' (English) or Portuguese equivalents ('Nenhum orçamento encontrado' / 'Nenhum resultado encontrado') was NOT found after applying the filter.

Evidence from the Orçamentos page after filtering:
- Visible lines found: 'Carregando...' and 'Mostrando 1 até 0 de 0 resultados'.
- Exact phrase checks: 'No budgets found' — NOT FOUND; 'Nenhum orçamento encontrado' — NOT FOUND; 'Nenhum resultado encontrado' — NOT FOUND.

Conclusion: Filtering produced an empty result set (table indicates 0 results), but the UI does not display a clear explicit message matching the expected phrases. Recommendation: If a clear 'No budgets found' message is required, UI should be updated to show a dedicated empty-state message (e.g., 'Nenhum orçamento encontrado').

Completed actions log (summary): navigations and login done, Orçamentos opened, filter applied twice (one on wrong page, then on Orçamentos). No further actions to perform. Stopping now as requested.

Attachments:

extracted_content_0.md:
<url>
http://localhost:3000/login#/
</url>
<query>
Search the visible page text for the exact phrases: 'No budgets found', 'Nenhum orçamento encontrado', 'Nenhum resultado encontrado'. Also return any nearby lines such as 'Mostrando ... resultados' or 'Carregando...' that indicate empty results or loading state. Provide matching lines and surrounding text.
</query>
<result>
"No budgets found" — Not found on page.

"Nenhum orçamento encontrado" — Not found on page.

"Nenhum resultado encontrado" — Not found on page.

Lines indicating empty results / loading state (exact text and surrounding lines from page):

Ops! Algo deu errado ao carregar.
Por favor, envie um print desta tela para o suporte.
---
diamondCristal Brindes
CRM & Gestão
Orçamentos
Pedidos
Financeiroexpand_more
Contas a ReceberContas a Pagar
Comissões
Cadastros
Fatores
notifications
GE
# quote_markerOrçamentos (CRM)
Gerencie propostas e acompanhamento comercial
add Novo Orçamento
Buscar Orçamento
search
Vendedor
Todos os Vendedores
Status
Todos
| Nr | Empresa / Cliente | Vendedor | Status | Total | Ações |
| --- | --- | --- | --- | --- | --- |
| Carregando... | | | | | |
AnteriorPróximo
Mostrando 1 até 0 de 0 resultados
chevron_leftchevron_right
</result>
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/d95bb131-7eb8-47f9-893c-29808b192131
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Clearing the filter restores results after an empty search
- **Test Code:** [TC016_Clearing_the_filter_restores_results_after_an_empty_search.py](./TC016_Clearing_the_filter_restores_results_after_an_empty_search.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/70bfefe7-5e1a-412b-8d44-28da979d338d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 Filter input accepts special characters without breaking the page
- **Test Code:** [TC017_Filter_input_accepts_special_characters_without_breaking_the_page.py](./TC017_Filter_input_accepts_special_characters_without_breaking_the_page.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/ae7fab9c-fcac-41dc-abd8-7c0704dda146
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018 Orçamentos page remains accessible from another authenticated section
- **Test Code:** [TC018_Oramentos_page_remains_accessible_from_another_authenticated_section.py](./TC018_Oramentos_page_remains_accessible_from_another_authenticated_section.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/e22079f8-cf97-4ee5-a583-8f03d410e11a
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 Mark a receivable as paid from details and verify status updates to PAID
- **Test Code:** [TC019_Mark_a_receivable_as_paid_from_details_and_verify_status_updates_to_PAID.py](./TC019_Mark_a_receivable_as_paid_from_details_and_verify_status_updates_to_PAID.py)
- **Test Error:** Summary of verification attempt:
- Logged in to the app and navigated to Contas a Receber (Receivables).
- Filters set: Empresa = TODOS; Status = Todos (after clearing filters).
- Found one receivable row in the list:
  - Pedido / Cliente: #PED-2026-001 — Indústrias Metalúrgicas Vale do Rio
  - Valor: R$ 1.850,00
  - Status (visible in list): PAGO (Paid)
  - Total na Tela: R$ 1.850,00
- Result: The status is already PAGO, therefore the 'mark as paid' action could not be performed (no unpaid record available to mark). Opening the receivable detail was not executed because the record is already paid; the verification that the status is PAID on the list is confirmed.
- Recommendation: To fully verify the 'mark as paid' flow, create or use a receivable with status not yet paid (e.g., 'A Vencer' or 'Vencido'), then open it and perform the mark-as-paid action. After doing that, confirm the status changes to PAGO.
Conclusion: The presence of a paid receivable was confirmed, but the specific action 'mark as paid' could not be demonstrated because the item was already paid. Success=false for completing the full requested end-to-end test (mark-as-paid not executed).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/191c3fb2-c3c2-4c2a-aa31-67d4146b1e06
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 Open receivables list and view receivable details page/section
- **Test Code:** [TC020_Open_receivables_list_and_view_receivable_details_pagesection.py](./TC020_Open_receivables_list_and_view_receivable_details_pagesection.py)
- **Test Error:** Result summary:
- Receivables page loaded and is accessible. Current URL: http://localhost:3000/login#/receivables
- Page header: 'CONTAS A RECEBER' visible and filters (company, date range, status) are present.
- Summary cards show zero balances and the table displays: 'Nenhum registro encontrado com os filtros atuais.'
- Because the table contains no rows, no receivable could be clicked and the 'Detalhes' view cannot be opened.
Recommendation to proceed (optional): clear or broaden filters (company, date range, status) or add receivable data to the system, then click the first row to view details.
Task completion: Partial — receivables list accessibility verified, opening a receivable NOT possible due to no records. No further actions performed per user request to stop.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/c419d3ea-75ec-4899-906b-fdf992996caf
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021 Mark a receivable as paid and verify a confirmation modal appears
- **Test Code:** [TC021_Mark_a_receivable_as_paid_and_verify_a_confirmation_modal_appears.py](./TC021_Mark_a_receivable_as_paid_and_verify_a_confirmation_modal_appears.py)
- **Test Error:** Result: Verification failed — initiating the payment confirmation flow did not show a visible confirmation modal containing the text 'Confirm'. Summary of what was done:
- Logged in with provided credentials and navigated to Financeiro -> Contas a Receber.
- Opened the first receivable (PED-2026-001) detail view.
- Attempted to click the 'Mark as paid' / payment confirmation button (one attempt on index 2081 failed due to element not interactable/stale). The detail view was reopened and an alternative 'check' payment button was clicked (click reported success), but a confirmation modal with the expected text 'Confirm' was not found on the page after that action.
Conclusion: The required confirmation modal was not detected; therefore the verification that initiating payment prompts a confirmation modal could not be completed successfully. Recommendations: (1) If the modal uses a different label (Portuguese like 'Confirmar' or other text), check for that text. (2) Inspect the DOM for hidden modals or toast notifications. (3) Re-run the click with a short wait after opening the detail to allow the modal to render, or capture a full-page snapshot after clicking the check button.
No further actions will be taken per request to stop.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/da9a10d3-44ac-403d-86f0-d968dc6c6864
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022 Payment processing fails after confirmation and shows error message
- **Test Code:** [TC022_Payment_processing_fails_after_confirmation_and_shows_error_message.py](./TC022_Payment_processing_fails_after_confirmation_and_shows_error_message.py)
- **Test Error:** Verification could not be completed: no receivable items are present in the 'Contas a Receber' list (current filter: 'A Vencer' selected) and the table shows 'Nenhum registro encontrado com os filtros atuais.' Without a receivable row to open and mark as paid, the payment confirmation workflow cannot be executed and the UI message 'Payment confirmation failed' cannot be observed. Recorded interaction details: attempted click failures on element indexes 564 and 1153 (stale/not interactable), successful clicks on indexes 1084 (CRISTAL), 1083 (TODOS) and 1712 (A Vencer). Current URL: /login#/receivables. Recommendation to complete test: ensure at least one unpaid receivable exists for the tested company or broaden/clear filters, then repeat: open first receivable -> click 'Mark as paid' -> click 'Confirm' -> assert that 'Payment confirmation failed' is visible. Success: false
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/12926de8-13cb-41e0-9c98-7b0efc88226a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023 After payment failure, receivable status remains unchanged (not PAID)
- **Test Code:** [TC023_After_payment_failure_receivable_status_remains_unchanged_not_PAID.py](./TC023_After_payment_failure_receivable_status_remains_unchanged_not_PAID.py)
- **Test Error:** Test cannot be completed: 'Contas a Receber' page contains no receivable items. Page displays the message: 'Nenhum registro encontrado com os filtros atuais.' Steps already completed: navigated to login, entered credentials, logged in, opened Financeiro → Contas a Receber. Blocking issue: no receivable rows to select and mark as paid, so the verification that a failed payment confirmation does not mark a receivable as PAID cannot be executed. Recommended next actions to enable the test: 1) clear any active filters (company/date/search) or select a company with receivables; 2) create or seed a test receivable entry; or 3) provide access to an account that already has receivables. Once a receivable row is available, re-run steps: open first receivable, click 'Marcar como pago' (Mark as paid), click 'Confirmar' (Confirm), and assert that 'PAID' is not displayed after a failed confirmation. Success: false
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/25b3bbec-d2c2-4da4-9b09-ed17e39fd296
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024 Cancel payment confirmation modal and verify no status change occurs
- **Test Code:** [TC024_Cancel_payment_confirmation_modal_and_verify_no_status_change_occurs.py](./TC024_Cancel_payment_confirmation_modal_and_verify_no_status_change_occurs.py)
- **Test Error:** Test cannot proceed: receivable already marked as 'PAGO' in the list, so the 'Mark as paid' action cannot be executed to open its confirmation modal. Therefore the requested verification (that cancelling the confirmation modal does not mark the receivable as paid) cannot be performed on this item. Observed page details: 'Contas a Receber' page with one row (PED-2026-001) showing status 'PAGO' (element index 960). Recommended remediation: use an unpaid receivable (status not 'PAGO') or revert the payment state for this receivable, then repeat these steps: 1) open the unpaid receivable, 2) click 'Mark as paid', 3) click 'Cancel' on the confirmation modal, 4) verify that 'PAID'/'PAGO' is not present. Because the required flow could not be executed, test result: success=false.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/c91c6ead-5436-4061-a379-71c79f2ded86
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC025 Mark as paid successfully and verify paid status is visible in details view
- **Test Code:** [TC025_Mark_as_paid_successfully_and_verify_paid_status_is_visible_in_details_view.py](./TC025_Mark_as_paid_successfully_and_verify_paid_status_is_visible_in_details_view.py)
- **Test Error:** Result: FAILED to verify PAID status.

What was attempted:
- Full login performed and main app accessed.
- Navigated to Orders and opened order PED-2026-001 multiple times to recover SPA state.
- Initiated payment confirmation flow by clicking the 'Recebimento (Entrada)' check control.
- Attempted to click the final 'Confirm' control but the click action failed due to the element being stale or not interactable (error messages: 'Click action failed - element not interactable / index stale'). Multiple index values were tried and SPA reloads caused indexes to become stale.

What was observed:
- No occurrences of 'PAID' or 'PAGO' found in the order/details view. Latest extracted UI text shows related finance labels such as 'AGUARDANDO PAGAMENTO' and 'Recebido Confirmado: R$ 0,00', indicating the payment was not recorded as received.

Why this is a failure:
- The final confirm action (required to mark as paid) did not complete successfully because the confirm button could not be clicked (stale/not-interactable). Therefore the UI did not update to a PAID state and the assertion cannot be satisfied.

Recommended next steps (manual or next automated attempt):
1) Re-open the order details and perform the confirm click using fresh element indexes (avoid stale indexes). Ensure waiting for any animations/loading and use a stable element when present.
2) If the confirm button remains not interactable, inspect browser console / network calls for errors or server-side failures.
3) As an alternative: attempt the confirm action via any available API endpoint or backend test utility if available.

Current status: success=false. The PAID status could not be verified due to failed confirm interaction and no visible 'PAID'/'PAGO' in the details view.

If desired, this agent can attempt one more confirm click using fresh elements (only one more attempt recommended to avoid loops), or pause for manual debugging. Which should be done next?

Attachments:

extracted_content_1.md:
<url>
http://localhost:3000/#/
</url>
<query>
Check the current order details page for: 1) any occurrences of the words 'PAID' or 'PAGO' (case-insensitive); 2) visible order IDs (e.g., 'PED-...'); 3) visible status labels or badges near the totals / Recebimento sections; 4) any confirmation dialog text or buttons that indicate success. Return found text snippets and element labels if possible.
</query>
<result>
1) Occurrences of 'PAID' or 'PAGO' (case-insensitive)
- No exact matches of "PAID" or "PAGO" found.
- Related occurrence: "AGUARDANDO PAGAMENTO" (contains "PAGAMENTO") — snippet: "AGUARDANDO PAGAMENTO"

2) Visible order IDs (e.g., 'PED-...')
- No visible order ID in the form "PED-..." or similar found.
- Nearby/order-related labels present (no ID): "VISUALIZAR PEDIDO", "Pedido *"

3) Visible status labels or badges near totals / Recebimento sections
- Status field near top:
  - "Status *"
  - "EM ABERTO"
- Gestão Financeira / totals / recebimento area (exact snippets):
  - "Saldo Estimado (Entrada + Restante - Custos)"
  - "Receita: R$ 0,00"
  - "Custos Previstos: R$ 0,00"
  - "Saldo Real (Recebido - Custos Reais)"
  - "Recebido Confirmado: R$ 0,00"
  - "Custos Reais: R$ 0,00"
  - "Status das Comissões"
  - "Nenhuma comissão gerada ainda. Confirme os recebimentos para gerar."
  - "Valor Total de Venda"
  - "R$ 0,00"
  - "Recebimento (Entrada)"
  - "Recebimento (Restante)"
- UI/icon markers visible in markup near recebimento lines: "check" appears adjacent to several fields (e.g., after "Recebimento (Entrada)", "Recebimento (Restante)")

4) Confirmation dialog text or buttons that indicate success
- No confirmation dialog text or success-button labels found.
- Related label present (not a dialog/button): "Recebido Confirmado: R$ 0,00"
</result>

extracted_content_0.md:
<url>
http://localhost:3000/#/
</url>
<query>
On the current page, list any visible order IDs (e.g., 'PED-...'), any occurrences of the words 'PAID' or 'PAGO', and the visible interactive elements that look like order rows or payment controls. Also report whether the orders list still shows 'Carregando pedidos...' or 'Nenhum registro encontrado'. Provide element labels/indexes if available.
</query>
<result>
Order IDs found:
- None (no "PED-..." or similar order ID visible on the page).

Occurrences of "PAID" / "PAGO":
- None found (neither "PAID" nor "PAGO" appears).

Interactive elements that look like order rows or payment controls (or other order-list controls) — labels / indexes where available:
- add_circle Novo Pedido (button)
- Buscar Pedido (search control)
- search (search icon)
- Vendedor (dropdown)
  - Options (as shown): 
    1. Todos os Vendedores
    2. VENDAS 01
    3. VENDAS 02
    4. VENDAS 03
    5. VENDAS 04
    6. VENDAS 05
  - Note: "Todos os Vendedores" and vendor names appear repeated in the raw text.
- Status (dropdown)
  - Options (as shown):
    1. Todos
    2. EM ABERTO
    3. EM PRODUÇÃO
    4. AGUARDANDO APROVAÇÃO
    5. AGUARDANDO NF
    6. AGUARDANDO PAGAMENTO
    7. AGUARDANDO PERSONALIZAÇÃO
    8. FINALIZADO
- filter_list Filtros (filters button)
- Data Limite Recebimento (date filter label/input)
- Data Saída Fornecedor (date filter label/input)
- Pagination controls:
  - Anterior (previous)
  - Próximo (next)
  - chevron_left (icon)
  - chevron_right (icon)
- Status/summary labels:
  - "Mostrando 1 até 0 de 0 resultados" (list summary)
  - "Carregando pedidos..." (loading indicator shown)

Order rows / payment controls specifically:
- No order rows are visible on the page (no individual order entries shown).
- No payment-specific controls (e.g., pay buttons, payment status badges labeled "PAID"/"PAGO") are visible.

Orders list state:
- "Carregando pedidos..." is present on the page.
- "Nenhum registro encontrado" is not present.
</result>
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/631322da-f996-4f08-9a39-8d2e6e6a4373
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC026 Receivables list loads and shows at least one row/item
- **Test Code:** [TC026_Receivables_list_loads_and_shows_at_least_one_rowitem.py](./TC026_Receivables_list_loads_and_shows_at_least_one_rowitem.py)
- **Test Error:** Verification summary:
- URL contains '/receivables': YES (current page: /#/receivables).
- Receivables list area visible: YES (table and filters are displayed).
- At least one receivable item visible: NO — page shows 'Nenhum registro encontrado com os filtros atuais.' (no items with current filters).

Conclusion: The Receivables page rendered correctly and the list area is visible, but there are no receivable items displayed with the current filters. If further action is desired, possible next steps: adjust/clear filters, change date range, search for a known order, or create/import test receivable data. Stopping as requested.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/f080bf24-3926-45f5-8ffb-4240e996cbd6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC027 View payables list from Payables page
- **Test Code:** [TC027_View_payables_list_from_Payables_page.py](./TC027_View_payables_list_from_Payables_page.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/e2205ad8-a309-4bcf-a901-f14935711959
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC028 Open payable details by clicking a payable item
- **Test Code:** [TC028_Open_payable_details_by_clicking_a_payable_item.py](./TC028_Open_payable_details_by_clicking_a_payable_item.py)
- **Test Error:** Resultado final da verificação:

- Ação principal: conseguir abrir um lançamento (payable) individual e visualizar seus detalhes.
- Observações técnicas: foi possível navegar até Financeiro > Contas a Pagar, aplicar o filtro da empresa CRISTAL e abrir a primeira entrada '#PED-2026-001'. A página de detalhes do pedido foi carregada com o cabeçalho 'VISUALIZAR PEDIDO' e informações visíveis (ex.: Valor Total do Pedido R$ 5.692,31 e demais campos do pedido).

- Verificação esperada (passo final): procurar o texto exato 'Detalhes'. Resultado: texto 'Detalhes' NÃO encontrado na página após 1 tentativa de busca/rolagem.

- Conclusão: O usuário consegue abrir um payable e ver a página de detalhes do pedido (funcionalidade de abrir e visualizar está presente). Porém a asserção exata que buscava o rótulo/wording 'Detalhes' falhou — a UI exibe 'VISUALIZAR PEDIDO' em vez de 'Detalhes'. Se o critério de aceitação exige o rótulo literal 'Detalhes', o teste falha; se o critério for apenas visualizar os dados do payable, o teste passa.

- Tentativas e falhas relevantes:
  - Clique Financeiro: 1 falha com índice antigo (256), depois sucesso com índice 664.
  - Clique no primeiro payable: 1 falha com índice antigo (1216), depois sucesso com novo índice.
  - Busca por 'Detalhes': 1 tentativa, não encontrado.

Recomendação: ajustar a verificação para aceitar o cabeçalho atual ('VISUALIZAR PEDIDO') ou confirmar com o produto qual rótulo deve aparecer. Encerrando a execução.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/ea2849a9-53cf-477f-b146-fa50c83bf25a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC029 Payables list shows key columns/fields for each payable
- **Test Code:** [TC029_Payables_list_shows_key_columnsfields_for_each_payable.py](./TC029_Payables_list_shows_key_columnsfields_for_each_payable.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/7da60dcd-2628-4ecb-9937-d248a885b0ae
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC030 Payables details view shows payable status and amount
- **Test Code:** [TC030_Payables_details_view_shows_payable_status_and_amount.py](./TC030_Payables_details_view_shows_payable_status_and_amount.py)
- **Test Error:** Result of verification:
- Payable status: Present. The payable details view contains the status label and shows the status as "EM ABERTO".
- Payable monetary amount: Not present. The details page contains many currency fields, but they show R$ 0,00 (examples: "Custo Prod. R$ 0,00", "Valor Total de Venda R$ 0,00", "Total Pedido R$ 0,00"). The expected amount R$ 1.550,00 (or any occurrence of "1.550,00") was not found in the extracted page content.
Conclusion: The requirement to verify that the payable details view displays both the payable's status and the monetary amount R$ 1.550,00 is NOT satisfied because the monetary amount is missing or zeroed in the details view. Next steps (optional): check data source/backend, open a different payable row, or refresh/reload data in the UI to see if amounts populate correctly.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/648a6a53-c1de-4108-b2d7-7bf78fad26bf
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC031 Attempt to mark a payable as paid and confirm payment (happy-path UI flow)
- **Test Code:** [TC031_Attempt_to_mark_a_payable_as_paid_and_confirm_payment_happy_path_UI_flow.py](./TC031_Attempt_to_mark_a_payable_as_paid_and_confirm_payment_happy_path_UI_flow.py)
- **Test Error:** Summary of verification and blocking issue:

- Current page: Contas a Pagar (URL: http://localhost:3000/login#/payables). The Contas a Pagar heading and UI are visible.
- Verified: The payables view is open (URL contains '#/payables') and the page loaded without errors after login. The Financeiro -> Contas a Pagar menu click succeeded (one stale attempt retried and succeeded).
- Blocker: No payable items are present in the list (totals show R$ 0,00 and no rows are displayed). Because there are no rows, the automated flow cannot: click the first payable, click 'Marcar como pago', or verify the 'Confirmar pagamento' confirmation text.

Actions that could unblock testing:
- Apply or clear filters (date/company) to reveal payables — try different date ranges or company selection.
- Create or import a payable record in the system for testing, then reopen the Contas a Pagar page.

Result: The UI flow to initiate marking a payable as paid could not be completed due to no payables present on the page. The state of the app and the exact blocking reason are documented above along with suggested next steps to enable completion.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/9ec46ed5-a382-417d-8c15-bc58af33ad9a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC032 Cancel payment confirmation does not mark payable as paid
- **Test Code:** [TC032_Cancel_payment_confirmation_does_not_mark_payable_as_paid.py](./TC032_Cancel_payment_confirmation_does_not_mark_payable_as_paid.py)
- **Test Error:** Summary of findings and next steps:

What was attempted and observed:
- Completed login to the app using provided credentials and reached the main UI (Orders page visible).
- Opened Financeiro menu multiple times and attempted to open 'Contas a Pagar'.
- Extracted the payables page content. The page shows the error message: 'Ops! Algo deu errado ao carregar.' and the payables table contains the row: 'Nenhum registro encontrado com os filtros atuais.'
- No 'Marcar como pago', 'Confirmar pagamento', or 'Cancelar' controls were present anywhere on the page. Current state therefore does not provide the dialog or actions required to perform the confirmation-dismissal test.

Why the test cannot be completed:
- The test requires opening a payable item and triggering a confirmation dialog; no payable items exist in the current view and the page displays a loading/error message. Without a payable record and confirmation dialog, the step 'dismiss confirmation and verify no change' cannot be executed or validated.

Evidence collected:
- Visible error message: 'Ops! Algo deu errado ao carregar.'
- Payables table first row: 'Nenhum registro encontrado com os filtros atuais.'
- Extraction of page content confirms absence of 'Marcar como pago', 'Confirmar pagamento', and 'Cancelar'.
- Test progress: 5/11 steps completed (login and navigation attempts). Remaining test steps: 6.

Recommended next actions to enable the test:
1) Fix the data/loading issue that causes the 'Ops! Algo deu errado ao carregar.' error (check backend/API and browser console). Once page loads correctly, re-run the test.
2) Ensure there is at least one payable record that matches current company/filters. Possible actions:
   - Change the company selector or filters on the payables page to include records.
   - Seed a payable test record in the database for the test account/environment.
3) After a payable record is present and the payables list loads, re-run the remaining steps:
   - Open the first payable
   - Click 'Marcar como pago'
   - Click 'Cancelar'
   - Verify 'Confirmar pagamento' is not visible and the payable remains unchanged.

If assistance is required, provide access to a test payable or confirm that the backend services are healthy so the payables list can be loaded. The test is marked unsuccessful because the required UI elements and data were not available.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/8db33b7e-15ac-4b6e-a4ea-d6bc1b75b054
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC033 Create a new CLIENTE partner and see it in the partners list
- **Test Code:** [TC033_Create_a_new_CLIENTE_partner_and_see_it_in_the_partners_list.py](./TC033_Create_a_new_CLIENTE_partner_and_see_it_in_the_partners_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/f3020864-2d5a-4ed5-a882-afa99893f750
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC034 Create a new FORNECEDOR partner and see it in the partners list
- **Test Code:** [TC034_Create_a_new_FORNECEDOR_partner_and_see_it_in_the_partners_list.py](./TC034_Create_a_new_FORNECEDOR_partner_and_see_it_in_the_partners_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/9a02d7fd-c5c8-48bc-81b3-836ddb7cafa4
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC035 Validate CPF/CNPJ field shows error for invalid document on save
- **Test Code:** [TC035_Validate_CPFCNPJ_field_shows_error_for_invalid_document_on_save.py](./TC035_Validate_CPFCNPJ_field_shows_error_for_invalid_document_on_save.py)
- **Test Error:** Summary of test attempt and results:

What was attempted:
- Logged in with provided credentials and reached the dashboard.
- Navigated to Cadastros -> Adicionar Novo -> CLIENTE form.
- Entered Name = 'Parceiro Doc Invalido' and Document (CNPJ/CPF) = '111.111.111-11'.
- Clicked SALVAR CADASTRO twice to trigger validation.

What happened:
- Both Save attempts failed: the Save button was not interactable / the element became stale before the click could be performed. No 'Invalid CPF/CNPJ' validation message appeared in any attempt.
- The page is currently showing the Cadastros list (Novo Cadastro form is not open in the current DOM snapshot), and interactive elements for Cadastros are available.

Conclusion:
- The test to verify that the system blocks saving invalid CPF/CNPJ and shows 'Invalid CPF/CNPJ' could not be completed because the Save action could not be executed (2 failed attempts). Therefore it is not possible to confirm the validation message from this automated run.

Recommendations / next steps (pick one):
1) Retry with alternative methods: reload the app, increase wait time before clicking Save, or attempt Save via keyboard (Enter) — needs permission to continue. 
2) Report a website issue to the development team: "Save button not interactable on CLIENTE form; prevents validation checks; intermittent SPA re-rendering/stale element indexes" — attach these logs/screenshots. 
3) Perform a manual check (user opens the app in a browser and tries the steps) and report the observed behavior.

Please indicate which next action is preferred (retry with alternatives, escalate to devs, or manual verification). Automation stopped because Save was attempted twice and both attempts failed (per test rules).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/e2c51743-7ba4-4b9a-a772-f1b5626f461e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC036 Required field validation: attempt to save partner with empty Name
- **Test Code:** [TC036_Required_field_validation_attempt_to_save_partner_with_empty_Name.py](./TC036_Required_field_validation_attempt_to_save_partner_with_empty_Name.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/8c959e9f-4bd6-498f-83e4-08ccbfb4f1a1
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC037 Required field validation: attempt to save partner with empty Document
- **Test Code:** [TC037_Required_field_validation_attempt_to_save_partner_with_empty_Document.py](./TC037_Required_field_validation_attempt_to_save_partner_with_empty_Document.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/08a12655-5d47-4bac-b649-d43adff9b9ec
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC038 Email Financeiro validation: invalid email format is rejected
- **Test Code:** [TC038_Email_Financeiro_validation_invalid_email_format_is_rejected.py](./TC038_Email_Financeiro_validation_invalid_email_format_is_rejected.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/56cc5600-e08d-42ac-8dc3-fdeff74da639
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC039 Cancel creating a partner does not add it to the list
- **Test Code:** [TC039_Cancel_creating_a_partner_does_not_add_it_to_the_list.py](./TC039_Cancel_creating_a_partner_does_not_add_it_to_the_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/34371de8-17bc-4afd-9b56-db1858bd3012
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC040 Create a new product and confirm it appears in the catalog
- **Test Code:** [TC040_Create_a_new_product_and_confirm_it_appears_in_the_catalog.py](./TC040_Create_a_new_product_and_confirm_it_appears_in_the_catalog.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/925a846d-f44f-4d0b-bf73-7a87ce1f6302
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC041 Prevent saving a duplicate product name and show "Product already exists"
- **Test Code:** [TC041_Prevent_saving_a_duplicate_product_name_and_show_Product_already_exists.py](./TC041_Prevent_saving_a_duplicate_product_name_and_show_Product_already_exists.py)
- **Test Error:** Unable to complete the duplicate-product test: Products catalog not reachable from the current session. Summary of attempts and blocking details:
- Login succeeded using provided credentials and the app shows the Orders (Pedidos) page ('Gestão de Pedidos').
- Multiple attempts to open the 'Cadastros' menu (7 different clicks) always showed 'Gerenciamento de Cadastros' or other sections; no 'Produtos' link appeared.
- Text searches for 'Produtos'/'Produto' returned no results.
- Direct navigation to /#/produtos was attempted several times; the UI remained on the Orders page and product UI elements are not present.
- No product creation steps could be executed (0 out of 2 product creates).
Probable causes:
- The logged-in user lacks permission to access Products, or the Products module is disabled/hidden in this environment.
- The Products route is different from expected or requires a different entry point.
Recommended next steps to proceed (choose one):
1) Provide a direct URL to the Products creation page (full route) so navigation can be retried (example: http://localhost:3000/#/produtos/novo or similar).
2) Confirm that the current user (cristalbrindes@cristalbrindes.com.br) has permission to manage products, or supply admin credentials that have product access.
3) If the Products menu is located in a different navigation area, provide the exact path or instructions to reveal it.
4) If this is an environment issue, allow access to a user account known to have product management rights or enable the Products module.
If further access is provided or directions given, automation can retry the following steps:
- Open Products -> New Product, fill Name 'Produto Duplicado E2E', Description 'Primeira criação do produto duplicado.', Price Unit '9.99', Save, verify presence.
- Attempt to create another product with the same name and verify a clear validation message like 'Product already exists' (or the app's localized equivalent).
Current result: test cannot be completed due to inability to reach the Products area. Requesting instructions or credentials to proceed.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/a10fc1f4-7baa-4c12-a21e-4696e5bea532
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC042 Validate required field: block save when Name is empty
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/139534b6-af41-4a10-8087-97e1a0cdaaa6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC043 Validate required field: block save when Price Unit is empty
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/c6747d89-9ee4-42a4-8156-0ad8a82a3012
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC044 Validate numeric input: reject non-numeric unit price
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/ddf97d0c-43d0-4a1c-a1a8-f3185db6c553
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC045 Validate business rule: reject negative unit price
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/c21823b9-369c-44ca-b926-9772a3c1d113
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC046 Cancel new product creation returns to catalog without saving
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/0605f117-5447-40e5-b246-6edeeba02d29
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC047 Generate commission record after confirming entry payment (happy path)
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/2c693fbe-4744-43b0-bb18-06c31001fe87
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC048 Commission amount reflects 1% rule after entry payment confirmation
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/cf5c16a7-5e43-4da1-b87b-f86ace81c92b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC049 Generate commission record after confirming remaining payment (happy path)
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/998544e7-112e-43ab-8e7d-ff1bb353dffa
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC050 Commission record is visibly linked to the current order
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/afef8b00-6505-47fb-b3d3-4f2a43bad222
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC051 Commission generation failure shows alert for entry payment flow
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/f81499e8-1780-486e-9f0d-21077494edc3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC052 Prevent duplicate commission creation on repeated entry payment confirmation
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/a51bb83a-98db-4ba6-a09e-d5be4c39077e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC053 Commission remains PENDING immediately after generation
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/8bc79a47-f4ba-4685-a6bf-7c2298a096ee
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC054 Update tax rate factor and see success confirmation
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/2503df0b-09b1-4a81-b9f1-1e542a7a499b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC055 Update multiple factors (tax, margin, contingency) and save successfully
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/4c13fb1a-c293-469f-b46e-0b083cdc30e7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC056 Invalid margin value shows validation error and prevents saving
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/6a0a2717-26b8-436a-afcb-a8af3d646d8b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC057 Non-numeric margin value shows validation error
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/a12dfa4b-cab6-4754-8c1b-a4a9440513d6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC058 Required field empty shows validation error
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/aa66e6e3-f86e-4811-9c1d-6fa2773c7760
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC059 Saved factors persist after leaving and returning to Calculation Factors
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/1a8cda50-abd4-48ea-8154-5f1b457381bf
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC060 Cancel/close without saving does not show success confirmation
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/187d19ad-421d-41bd-8a29-08dd45af5fd7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC061 Enter extremely large tax rate value shows validation error
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/5ddf5dfb-5d26-4270-ac01-c22d03addf52
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC062 Create an audit log entry when changing an order status
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/6dc868e0-f54f-4daa-a913-e87c13762a49
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC063 Audit log shows the latest status change entry at the top of the list
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/30281a24-f0e3-49bc-b414-06cfb7b66add
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC064 Create an audit log entry when changing an order value/amount
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/ed8e5e68-d750-43e6-a324-1e63941a9cff
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC065 Audit logs remain visible after a page reload of the order details
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/60961e09-b4f3-49ed-83e3-3d8e04a98c1c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC066 Audit logs panel can be opened and closed without changing data
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7f110b8e-85d3-4662-927d-050bb51b0340/09ee3a56-c69f-48f5-9b74-cb875a43a5fd
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **30.30** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---