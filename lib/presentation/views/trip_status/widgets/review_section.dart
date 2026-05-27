import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class ReviewSection extends StatelessWidget {
  final double userRating;
  final TextEditingController reviewCommentController;
  final bool isSubmittingReview;
  final Function(double) onRatingChanged;
  final VoidCallback onSubmitReview;

  const ReviewSection({
    super.key,
    required this.userRating,
    required this.reviewCommentController,
    required this.isSubmittingReview,
    required this.onRatingChanged,
    required this.onSubmitReview,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Card(
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: AppTheme.primaryAmber, width: 1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Calificar al Fletero',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: AppTheme.primaryAmber,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final starIndex = index + 1;
                  return IconButton(
                    icon: Icon(
                      Icons.star_rounded,
                      color: userRating >= starIndex
                          ? AppTheme.primaryAmber
                          : Colors.white24,
                      size: 32,
                    ),
                    onPressed: () => onRatingChanged(starIndex.toDouble()),
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: reviewCommentController,
                decoration: const InputDecoration(
                  labelText: 'Deja un comentario sobre el servicio...',
                  alignLabelWithHint: true,
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: isSubmittingReview ? null : onSubmitReview,
                child: isSubmittingReview
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                        ),
                      )
                    : const Text('SUBIR CALIFICACIÓN'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
