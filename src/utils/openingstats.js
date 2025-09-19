import { supabase, setUserContext } from './supabase.js';

export const getUserOpeningStats = async (username) => {
    console.log("Getting opening stats for username:", username);
    
    try {
        await setUserContext(username);

        const { data: openingStats, error } = await supabase
            .from('opening_stats')
            .select('*')
            .eq('username', username);

        if (error) {
            console.error("Supabase error:", error);
            throw error;
        }

        //console.log("Raw opening stats from database:", openingStats);

        if (!openingStats || openingStats.length === 0) {
            console.log("No opening stats found for username:", username);
            return { allOpenings: [{
        id: 1,
        name: "Queen's Gambit",
        icon: "♕",
        games: 10,
        winRate: 70,
        accuracy: 85,
        blunders: 2,
        whiteWins: 4,
        blackWins: 3,
        draws: 3
    }] };
        }

        const getOpeningIcon = (openingName) => {
            const name = openingName.toLowerCase();
            if (name.includes('sicilian')) return '♛';
            if (name.includes('queen')) return '♕';
            if (name.includes('king')) return '♔';
            if (name.includes('italian') || name.includes('giuoco')) return '♗';
            if (name.includes('french')) return '♞';
            if (name.includes('english')) return '♜';
            if (name.includes('ruy') || name.includes('lopez')) return '♖';
            if (name.includes('caro') || name.includes('kann')) return '♙';
            if (name.includes('scotch')) return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
            if (name.includes('vienna')) return '🇦🇹';
            if (name.includes('dutch')) return '🇳🇱';
            if (name.includes('nimzo')) return '♞';
            if (name.includes('london')) return '🏙️';
            return '♟';
        };

        // No aggregation needed - each row is already aggregated data for one opening
        const allOpenings = openingStats.map((stat, index) => {
            const avgACPL = stat.avg_opening_acpl || 0;
            
            function acplToAccuracy(acpl) {
                const k = 0.004;
                let acc = 100 * Math.exp(-k * acpl);
                return parseFloat(acc.toFixed(2));
            }
            
            return {
                id: index + 1,
                name: stat.opening_name,
                icon: getOpeningIcon(stat.opening_name),
                games: stat.total_games || 0,
                winRate: stat.win_rate || 0,  // Use the pre-calculated win_rate
                accuracy: stat.opening_accuracy || acplToAccuracy(avgACPL),
                blunders: stat.avg_opening_blunders || 0,
                whiteWins: stat.total_white_wins || 0,
                blackWins: stat.total_black_wins || 0,
                draws: stat.total_draws || 0,
                losses :stat.total_losses
            };
        }).sort((a, b) => b.games - a.games);

        //console.log("Processed opening stats:", allOpenings);
        return { allOpenings };

    } catch (error) {
        console.error('Error fetching opening stats:', error);
        console.log('Error details:', JSON.stringify(error, null, 2));
        return { allOpenings: [{
        id: 1,
        name: "Queen's Gambit",
        icon: "♕",
        games: 10,
        winRate: 70,
        accuracy: 85,
        blunders: 2,
        whiteWins: 4,
        blackWins: 3,
        draws: 3
    }] };
    }
};