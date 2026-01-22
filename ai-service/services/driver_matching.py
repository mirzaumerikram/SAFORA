import numpy as np
from datetime import datetime, timedelta

class DriverMatchingService:
    def __init__(self):
        # Weights for scoring algorithm
        self.DISTANCE_WEIGHT = 0.50
        self.RATING_WEIGHT = 0.30
        self.FAIRNESS_WEIGHT = 0.20
        
        self.MAX_SEARCH_RADIUS = 10  # km
    
    def rank_drivers(self, drivers, passenger_location, is_pink_pass=False):
        """
        Rank drivers using weighted scoring algorithm
        
        Args:
            drivers: list of driver dicts with:
                - id
                - location (lat, lng)
                - rating (0-5)
                - idle_time (minutes in last 4 hours)
                - total_online_time (minutes in last 4 hours)
                - gender (for Pink Pass filtering)
            passenger_location: dict with lat, lng
            is_pink_pass: bool, filter for female drivers only
        
        Returns:
            list of ranked driver IDs with scores
        """
        if is_pink_pass:
            # Filter for female drivers only
            drivers = [d for d in drivers if d.get('gender') == 'female']
        
        if not drivers:
            return []
        
        ranked_drivers = []
        
        for driver in drivers:
            # Calculate distance score (normalize by max radius)
            distance_km = self._calculate_distance(
                passenger_location,
                driver['location']
            )
            
            if distance_km > self.MAX_SEARCH_RADIUS:
                continue
            
            distance_score = 1.0 - (distance_km / self.MAX_SEARCH_RADIUS)
            
            # Calculate rating score (normalize by max rating 5.0)
            rating_score = driver.get('rating', 5.0) / 5.0
            
            # Calculate fairness score
            idle_time = driver.get('idle_time', 0)
            total_online = driver.get('total_online_time', 1)
            fairness_score = idle_time / max(total_online, 1)
            
            # Weighted sum
            final_score = (
                self.DISTANCE_WEIGHT * distance_score +
                self.RATING_WEIGHT * rating_score +
                self.FAIRNESS_WEIGHT * fairness_score
            )
            
            ranked_drivers.append({
                'driver_id': driver['id'],
                'score': round(final_score, 4),
                'distance_km': round(distance_km, 2),
                'rating': driver.get('rating', 5.0),
                'fairness': round(fairness_score, 4),
                'breakdown': {
                    'distance_score': round(distance_score, 4),
                    'rating_score': round(rating_score, 4),
                    'fairness_score': round(fairness_score, 4)
                }
            })
        
        # Sort by score descending
        ranked_drivers.sort(key=lambda x: x['score'], reverse=True)
        
        return ranked_drivers
    
    def _calculate_distance(self, loc1, loc2):
        """
        Calculate Haversine distance between two coordinates
        
        Args:
            loc1: dict with lat, lng
            loc2: dict with lat, lng
        
        Returns:
            distance in kilometers
        """
        lat1, lng1 = loc1['lat'], loc1['lng']
        lat2, lng2 = loc2['lat'], loc2['lng']
        
        # Convert to radians
        lat1, lng1, lat2, lng2 = map(np.radians, [lat1, lng1, lat2, lng2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlng/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        # Earth radius in km
        r = 6371
        
        return c * r

# Singleton instance
driver_matching_service = DriverMatchingService()
