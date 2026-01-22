import numpy as np
import pickle
import os
from sklearn.linear_model import LinearRegression

class PricingService:
    def __init__(self):
        model_path = os.getenv('PRICE_MODEL_PATH', 'models/price_model.pkl')
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
        else:
            # Create a simple model if none exists
            self.model = None
            print("Warning: Price model not found. Using fallback calculation.")
        
        # Pricing constants
        self.BASE_FARE = 50  # PKR
        self.RATE_PER_KM = 25  # PKR
        self.RATE_PER_MIN = 3  # PKR
        self.SURGE_MULTIPLIERS = {
            'low': 1.0,
            'medium': 1.2,
            'high': 1.5,
            'peak': 2.0
        }
    
    def predict_price(self, features):
        """
        Predict ride price using Linear Regression model
        
        Args:
            features: dict with keys:
                - distance (km)
                - duration (minutes)
                - time_of_day (hour, 0-23)
                - day_of_week (0-6, Monday=0)
                - demand_level ('low', 'medium', 'high', 'peak')
                - origin_area (area code or zone)
                - traffic_multiplier (1.0-2.0)
        
        Returns:
            dict with predicted price and breakdown
        """
        distance = features.get('distance', 0)
        duration = features.get('duration', 0)
        demand_level = features.get('demand_level', 'low')
        traffic_multiplier = features.get('traffic_multiplier', 1.0)
        
        if self.model:
            # Prepare features for model
            X = np.array([[
                distance,
                duration,
                features.get('time_of_day', 12),
                features.get('day_of_week', 0),
                self._encode_demand(demand_level),
                features.get('origin_area', 0),
                traffic_multiplier
            ]])
            
            predicted_price = self.model.predict(X)[0]
        else:
            # Fallback calculation
            base_price = self.BASE_FARE
            distance_cost = distance * self.RATE_PER_KM
            time_cost = duration * self.RATE_PER_MIN
            
            subtotal = base_price + distance_cost + time_cost
            surge = self.SURGE_MULTIPLIERS.get(demand_level, 1.0)
            
            predicted_price = subtotal * surge * traffic_multiplier
        
        # Ensure minimum and maximum bounds
        predicted_price = max(self.BASE_FARE, min(predicted_price, 2000))
        
        # Calculate breakdown
        breakdown = self._calculate_breakdown(distance, duration, demand_level, traffic_multiplier)
        
        return {
            'estimated_price': round(predicted_price, 2),
            'breakdown': breakdown,
            'currency': 'PKR'
        }
    
    def _encode_demand(self, demand_level):
        """Encode demand level to numeric value"""
        mapping = {'low': 0, 'medium': 1, 'high': 2, 'peak': 3}
        return mapping.get(demand_level, 0)
    
    def _calculate_breakdown(self, distance, duration, demand_level, traffic_multiplier):
        """Calculate price breakdown"""
        base = self.BASE_FARE
        distance_cost = distance * self.RATE_PER_KM
        time_cost = duration * self.RATE_PER_MIN
        surge_multiplier = self.SURGE_MULTIPLIERS.get(demand_level, 1.0)
        
        subtotal = base + distance_cost + time_cost
        surge_amount = subtotal * (surge_multiplier - 1.0)
        traffic_amount = subtotal * (traffic_multiplier - 1.0)
        
        return {
            'base_fare': round(base, 2),
            'distance_cost': round(distance_cost, 2),
            'time_cost': round(time_cost, 2),
            'surge_charge': round(surge_amount, 2),
            'traffic_charge': round(traffic_amount, 2)
        }

# Singleton instance
pricing_service = PricingService()
