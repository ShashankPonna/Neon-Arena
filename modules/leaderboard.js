import { supabase } from './supabase.js';

export class LeaderboardManager {
    /**
     * Fetches the top scores from the global leaderboard.
     * @param {number} limit 
     * @returns {Promise<Array>} Array of { name, survival_time, score }
     */
    static async fetchTopScores(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('name, survival_time, score')
                .order('survival_time', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            return [];
        }
    }

    /**
     * Attempts to upsert a score. The database RPC guarantees 
     * it only overwrites if the new survival time is higher.
     * @param {string} name 
     * @param {number} survivalTime 
     * @param {number} score 
     */
    static async submitScore(name, survivalTime, score) {
        if (!name || name.trim() === '') return;
        
        try {
            const { error } = await supabase.rpc('submit_score', {
                p_name: name.trim(),
                p_survival_time: parseFloat(survivalTime.toFixed(1)),
                p_score: Math.floor(score)
            });
            
            if (error) throw error;
        } catch (err) {
            console.error('Error submitting score:', err);
        }
    }
}
