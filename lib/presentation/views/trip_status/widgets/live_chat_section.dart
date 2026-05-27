import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/chat_message_model.dart';

class LiveChatSection extends StatelessWidget {
  final Stream<List<ChatMessageModel>> chatMessagesStream;
  final String currentUserId;
  final TextEditingController messageController;
  final ScrollController scrollController;
  final Function(String) onSendMessage;

  const LiveChatSection({
    super.key,
    required this.chatMessagesStream,
    required this.currentUserId,
    required this.messageController,
    required this.scrollController,
    required this.onSendMessage,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 240,
      margin: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<ChatMessageModel>>(
              stream: chatMessagesStream,
              builder: (context, chatSnapshot) {
                final messages = chatSnapshot.data ?? [];

                if (messages.isEmpty) {
                  return const Center(
                    child: Text(
                      'Comienza la negociación en el chat seguro.',
                      style: TextStyle(color: AppTheme.textSecondary, fontStyle: FontStyle.italic, fontSize: 12),
                    ),
                  );
                }

                return ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.all(12),
                  itemCount: messages.length,
                  itemBuilder: (context, idx) {
                    final msg = messages[idx];
                    final isMe = msg.senderId == currentUserId;

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isMe ? AppTheme.primaryAmber : Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(12),
                            topRight: const Radius.circular(12),
                            bottomLeft: Radius.circular(isMe ? 12 : 0),
                            bottomRight: Radius.circular(isMe ? 0 : 12),
                          ),
                        ),
                        child: Text(
                          msg.content,
                          style: TextStyle(
                            color: isMe ? Colors.black : Colors.white,
                            fontSize: 13,
                            fontWeight: isMe ? FontWeight.w600 : FontWeight.normal,
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: messageController,
                    decoration: InputDecoration(
                      hintText: 'Escribir mensaje...',
                      fillColor: Colors.black.withOpacity(0.2),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                        borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                        borderSide: const BorderSide(color: AppTheme.primaryAmber, width: 1.5),
                      ),
                    ),
                    onSubmitted: (val) => onSendMessage(val),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppTheme.primaryAmber,
                  radius: 18,
                  child: IconButton(
                    icon: const Icon(Icons.send_rounded, color: Colors.black, size: 14),
                    onPressed: () => onSendMessage(messageController.text),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
