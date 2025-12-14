'use server'

import { createClient } from '../lib/supabase/server'

export async function saveItemSelections(selections: {
    itemId: string
    quantity: number
    selectedOptionIndex?: number
    optionName?: string
    price?: number
}[]) {
    const supabase = createClient()

    try {
        const updates = selections.map(async (sel) => {
            // 1. Fetch current item to validate/get static price if needed (optional but good for safety)
            // For now, we trust the client's index but we should store the structured data.

            // We need to construct the legacy `user_selected_options` JSON or a new structure.
            // The current checkout page reads `user_selected_options`.
            // Let's format it so it works with the existing checkout logic AND new logic.

            const payload: any = {
                quantity: sel.quantity // This goes to user_quantity column? No, we have user_quantity column.
            }

            // If there's an option selected
            let userSelectedOptions = null
            if (sel.optionName) {
                userSelectedOptions = {
                    optionName: sel.optionName,
                    priceStr: sel.price?.toString(), // checkout page uses this
                    quantity: sel.quantity
                }
            }

            return supabase
                .from('request_items')
                .update({
                    user_quantity: sel.quantity,
                    user_selected_options: userSelectedOptions
                })
                .eq('id', sel.itemId)
        })

        await Promise.all(updates)
        return { success: true }
    } catch (error) {
        console.error('Failed to save selections:', error)
        return { success: false, error: 'Failed to save selections' }
    }
}
