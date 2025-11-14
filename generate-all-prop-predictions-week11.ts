import { generateAllPropPredictions, getBestPropBets } from './src/lib/predictPlayerProps';

async function main() {
  console.log('\n🎯 GENERATING ALL PROP PREDICTIONS FOR WEEK 11\n');
  
  // Generate predictions for all prop markets
  const result = await generateAllPropPredictions(11, 2025);
  
  console.log(`\n✅ Generated ${result.saved} predictions from ${result.total} props analyzed\n`);
  
  // Get top 10 picks across all markets
  const topPicks = await getBestPropBets(10, 11, 2025);
  
  console.log('\n🏆 TOP 10 PLAYER PROP PICKS (ALL MARKETS):\n');
  console.log('='.repeat(80));
  
  topPicks.forEach((pick, index) => {
    const marketName = pick.prop_market
      .replace('player_', '')
      .replace('_', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    console.log(`\n${index + 1}. ${pick.player_name} (${pick.position}) - ${pick.team} vs ${pick.opponent}`);
    console.log(`   📊 ${pick.recommended_bet} ${pick.prop_line} ${marketName}`);
    console.log(`   📈 Model: ${pick.predicted_value.toFixed(1)} | Edge: ${pick.value_score >= 0 ? '+' : ''}${pick.value_score.toFixed(1)} | Confidence: ${pick.confidence_score.toFixed(0)}%`);
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
}

main().catch(console.error);


